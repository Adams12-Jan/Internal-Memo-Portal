import fs from 'fs/promises';
import path from 'path';
import process from 'process';

const argv = process.argv.slice(2);
const envFileArg = argv.find(arg => !arg.startsWith('-')) || '.env.render';
const triggerDeploy = argv.includes('--trigger-deploy');
const apiKeyFileIndex = argv.findIndex(arg => arg === '--render-api-key-file');
const apiKeyFile = apiKeyFileIndex >= 0 ? argv[apiKeyFileIndex + 1] : null;
const serviceNameArgIndex = argv.findIndex(arg => arg === '--render-service-name');
const serviceNameArg = serviceNameArgIndex >= 0 ? argv[serviceNameArgIndex + 1] : null;
const serviceIdArgIndex = argv.findIndex(arg => arg === '--render-service-id');
const serviceIdArg = serviceIdArgIndex >= 0 ? argv[serviceIdArgIndex + 1] : null;

const renderApiKeyFromEnv = process.env.RENDER_API_KEY;
const renderServiceNameFromEnv = process.env.RENDER_SERVICE_NAME;
const renderServiceIdFromEnv = process.env.RENDER_SERVICE_ID;
const helperEnvKeys = new Set(['RENDER_API_KEY', 'RENDER_SERVICE_NAME', 'RENDER_SERVICE_ID']);

function fail(message) {
  throw new Error(message);
}

async function parseEnvFile(filePath) {
  const source = await fs.readFile(filePath, 'utf8');
  const lines = source.split(/\r?\n/);
  const envPairs = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex < 0) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    envPairs.push({ key, value });
  }

  return envPairs;
}

function getEnvMap(envPairs) {
  return envPairs.reduce((map, pair) => {
    map.set(pair.key, pair.value);
    return map;
  }, new Map());
}

async function parseEnvMap(filePath) {
  const envPairs = await parseEnvFile(filePath);
  return getEnvMap(envPairs);
}

async function getRenderApiKey(envFilePath) {
  if (renderApiKeyFromEnv) {
    return renderApiKeyFromEnv;
  }

  const candidateFiles = [];
  if (apiKeyFile) {
    candidateFiles.push(apiKeyFile);
  }
  candidateFiles.push(envFilePath);

  for (const candidate of candidateFiles) {
    try {
      const envMap = getEnvMap(await parseEnvFile(path.resolve(process.cwd(), candidate)));
      if (envMap.has('RENDER_API_KEY')) {
        return envMap.get('RENDER_API_KEY');
      }
    } catch {
      // ignore missing or unreadable files until we find a valid key
    }
  }

  return null;
}

function getRenderServiceName(envMap) {
  return serviceNameArg || renderServiceNameFromEnv || envMap?.get('RENDER_SERVICE_NAME');
}

function getRenderServiceId(envMap) {
  return serviceIdArg || renderServiceIdFromEnv || envMap?.get('RENDER_SERVICE_ID');
}

async function resolveAuthAndServiceInfo(envFilePath) {
  const apiKey = await getRenderApiKey(envFilePath);
  if (!apiKey || apiKey === 'your_render_api_key') {
    fail('Missing or placeholder RENDER_API_KEY. Provide a real Render API key as an env var or via --render-api-key-file <path>.');
  }

  let envMap = new Map();
  try {
    envMap = await parseEnvMap(envFilePath);
  } catch {
    // continue with any env vars or CLI overrides
  }

  const serviceName = getRenderServiceName(envMap);
  const serviceId = getRenderServiceId(envMap);
  if (!serviceName && !serviceId) {
    fail('Missing RENDER_SERVICE_NAME or RENDER_SERVICE_ID. Set one of them as an env var, in .env.render, or with --render-service-name / --render-service-id.');
  }

  return { apiKey, serviceName, serviceId };
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${typeof data === 'object' ? JSON.stringify(data) : data}`);
  }
  return data;
}

async function resolveServiceId(apiKey, serviceName, serviceId) {
  if (serviceId) {
    return serviceId;
  }

  const url = new URL('https://api.render.com/v1/services');
  url.searchParams.set('name', serviceName);

  const services = await fetchJson(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!Array.isArray(services) || services.length === 0) {
    fail(`No Render service found with name '${serviceName}'.`);
  }

  if (services.length > 1) {
    console.warn(`Warning: More than one Render service matched name '${serviceName}'. Using the first match.`);
  }

  return services[0].id;
}

async function updateRenderEnvVars(apiKey, serviceId, envVars) {
  const url = `https://api.render.com/v1/services/${serviceId}/env-vars`;
  console.log(`Updating Render env vars for service ${serviceId}...`);

  const filteredVars = envVars.filter(({ key }) => !helperEnvKeys.has(key));
  if (filteredVars.length !== envVars.length) {
    console.log(`Skipping ${envVars.length - filteredVars.length} helper-only env var(s): ${envVars.filter(({ key }) => helperEnvKeys.has(key)).map(({ key }) => key).join(', ')}`);
  }

  const body = JSON.stringify(filteredVars.map(({ key, value }) => ({ key, value })));
  const result = await fetchJson(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body
  });

  console.log(`Updated ${Array.isArray(result) ? result.length : 'unknown'} env vars.`);
  return result;
}

async function triggerRenderDeploy(apiKey, serviceId) {
  const url = `https://api.render.com/v1/services/${serviceId}/deploys`;
  console.log(`Triggering Render deploy for service ${serviceId}...`);

  const result = await fetchJson(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ clearCache: 'do_not_clear' })
  });

  if (result && result.id) {
    console.log(`Deploy triggered: ${result.id}`);
  } else {
    console.log('Deploy triggered. Response:', result);
  }
  return result;
}

async function run() {
  const envFilePath = path.resolve(process.cwd(), envFileArg);
  console.log(`Loading env file: ${envFilePath}`);

  let envVars;
  try {
    envVars = await parseEnvFile(envFilePath);
  } catch (error) {
    fail(`Unable to read env file: ${error.message}`);
  }

  if (!envVars.length) {
    fail(`No environment variables found in ${envFileArg}.`);
  }

  const { apiKey, serviceName, serviceId } = await resolveAuthAndServiceInfo(envFilePath);
  const resolvedServiceId = await resolveServiceId(apiKey, serviceName, serviceId);
  const serviceEnvVars = envVars.filter(({ key }) => !helperEnvKeys.has(key));
  if (!serviceEnvVars.length) {
    fail(`No service environment variables found in ${envFileArg} after removing helper-only keys.`);
  }
  await updateRenderEnvVars(apiKey, resolvedServiceId, serviceEnvVars);

  if (triggerDeploy) {
    await triggerRenderDeploy(apiKey, resolvedServiceId);
  } else {
    console.log('Render deploy trigger skipped. Use --trigger-deploy to trigger a deploy after env sync.');
  }
}

run().catch(error => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
