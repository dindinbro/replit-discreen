const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");

function loadEnvFile() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

function getS3Config() {
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION || "auto";
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const prefix = process.env.S3_PREFIX || "";

  const missing = [];
  if (!bucket) missing.push("S3_BUCKET");
  if (!accessKeyId) missing.push("S3_ACCESS_KEY_ID");
  if (!secretAccessKey) missing.push("S3_SECRET_ACCESS_KEY");
  if (!endpoint) missing.push("S3_ENDPOINT");

  if (missing.length > 0) {
    console.error("\nMissing environment variables: " + missing.join(", "));
    console.error("\nAdd them to your .env file:");
    console.error("  nano .env\n");
    process.exit(1);
  }

  return { endpoint: endpoint || "", region, bucket, accessKeyId, secretAccessKey, prefix };
}

function createS3Client(config) {
  const clientConfig = {
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  };

  if (config.endpoint) {
    clientConfig.endpoint = config.endpoint;
    clientConfig.forcePathStyle = true;
  }

  return new S3Client(clientConfig);
}

async function uploadFile(localPath, remoteKey) {
  if (!fs.existsSync(localPath)) {
    console.error("File not found: " + localPath);
    return false;
  }

  const stat = fs.statSync(localPath);
  if (!stat.isFile()) {
    console.error("Not a file: " + localPath + " (use upload-dir for directories)");
    return false;
  }

  const config = getS3Config();
  const client = createS3Client(config);
  const filename = path.basename(localPath);
  const key = remoteKey || (config.prefix ? config.prefix + filename : filename);

  const fileBuffer = fs.readFileSync(localPath);
  const sizeMB = (fileBuffer.length / 1024 / 1024).toFixed(1);
  console.log("Uploading " + filename + " (" + sizeMB + " MB) -> " + key);

  await client.send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: fileBuffer,
  }));

  console.log("OK: " + filename + " uploaded");
  return true;
}

function getAllFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push.apply(files, getAllFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

async function uploadDir(dirPath, remotePrefix) {
  if (!fs.existsSync(dirPath)) {
    console.error("Directory not found: " + dirPath);
    process.exit(1);
  }

  const stat = fs.statSync(dirPath);
  if (!stat.isDirectory()) {
    console.error("Not a directory: " + dirPath + " (use upload for single files)");
    process.exit(1);
  }

  const config = getS3Config();
  const prefix = remotePrefix != null ? remotePrefix : config.prefix;
  const files = getAllFiles(dirPath);

  if (files.length === 0) {
    console.log("No files found in directory");
    return;
  }

  console.log("Found " + files.length + " files to upload from " + dirPath + "\n");

  let uploaded = 0;
  let failed = 0;
  for (const filePath of files) {
    const relativePath = path.relative(dirPath, filePath);
    const key = prefix ? prefix + relativePath : relativePath;
    try {
      await uploadFile(filePath, key);
      uploaded++;
    } catch (err) {
      console.error("FAIL: " + relativePath + " - " + err.message);
      failed++;
    }
  }

  console.log("\nDone: " + uploaded + " uploaded, " + failed + " failed, " + files.length + " total");
}

async function downloadFile(remoteKey, localPath) {
  const config = getS3Config();
  const client = createS3Client(config);

  console.log("Downloading " + remoteKey + "...");

  try {
    const response = await client.send(new GetObjectCommand({
      Bucket: config.bucket,
      Key: remoteKey,
    }));

    if (response.Body) {
      const dir = path.dirname(localPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmpPath = localPath + ".tmp";
      const writeStream = fs.createWriteStream(tmpPath);
      await pipeline(response.Body, writeStream);
      fs.renameSync(tmpPath, localPath);
      const sizeMB = (fs.statSync(localPath).size / 1024 / 1024).toFixed(1);
      console.log("OK: " + remoteKey + " (" + sizeMB + " MB) -> " + localPath);
    }
  } catch (err) {
    if (err.name === "NoSuchKey" || (err.$metadata && err.$metadata.httpStatusCode === 404)) {
      console.error("File not found in R2: " + remoteKey);
    } else {
      throw err;
    }
  }
}

async function syncDb(dataDir) {
  const config = getS3Config();
  const client = createS3Client(config);

  console.log("Syncing .db files from bucket \"" + config.bucket + "\"...");

  const response = await client.send(new ListObjectsV2Command({
    Bucket: config.bucket,
    Prefix: config.prefix,
  }));

  const objects = response.Contents || [];
  const dbFiles = objects.filter(function(obj) { return obj.Key && obj.Key.endsWith(".db"); });

  if (dbFiles.length === 0) {
    console.log("No .db files found in bucket");
    return;
  }

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  let downloaded = 0;
  let skipped = 0;
  for (const obj of dbFiles) {
    const key = obj.Key;
    const filename = path.basename(key);
    const localPath = path.join(dataDir, filename);

    const localExists = fs.existsSync(localPath);
    const localSize = localExists ? fs.statSync(localPath).size : 0;
    const remoteSize = obj.Size || 0;

    if (localExists && localSize === remoteSize) {
      console.log("SKIP: " + filename + " already up to date (" + (remoteSize / 1024 / 1024).toFixed(1) + " MB)");
      skipped++;
      continue;
    }

    await downloadFile(key, localPath);
    downloaded++;
  }

  console.log("\nSync complete: " + downloaded + " downloaded, " + skipped + " skipped, " + dbFiles.length + " total");
}

async function listFiles(prefix) {
  const config = getS3Config();
  const client = createS3Client(config);
  const searchPrefix = prefix != null ? prefix : config.prefix;

  const response = await client.send(new ListObjectsV2Command({
    Bucket: config.bucket,
    Prefix: searchPrefix,
  }));

  const files = response.Contents || [];
  if (files.length === 0) {
    console.log("No files found");
    return;
  }

  let totalSize = 0;
  console.log("Found " + files.length + " files:\n");
  for (const f of files) {
    const size = f.Size || 0;
    totalSize += size;
    const sizeMB = (size / 1024 / 1024).toFixed(2);
    const date = f.LastModified ? f.LastModified.toISOString().slice(0, 19) : "unknown";
    console.log("  " + f.Key + "  (" + sizeMB + " MB, " + date + ")");
  }
  console.log("\nTotal: " + (totalSize / 1024 / 1024).toFixed(2) + " MB");
}

async function deleteFile(remoteKey) {
  const config = getS3Config();
  const client = createS3Client(config);

  await client.send(new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: remoteKey,
  }));
  console.log("Deleted: " + remoteKey);
}

var args = process.argv.slice(2);
var command = args[0];

function printUsage() {
  console.log("\nDisscreen R2 CLI\n");
  console.log("Usage:");
  console.log("  node server/r2-cli.cjs <command> [options]\n");
  console.log("Commands:");
  console.log("  upload <local-path> [remote-key]     Upload a single file");
  console.log("  upload-dir <local-dir> [prefix]      Upload an entire directory");
  console.log("  download <remote-key> <local-path>   Download a single file");
  console.log("  sync-db [local-dir]                  Sync all .db files (default: ./data)");
  console.log("  list [prefix]                        List files in the bucket");
  console.log("  delete <remote-key>                  Delete a file from R2\n");
}

async function main() {
  if (!command || command === "help" || command === "--help") {
    printUsage();
    process.exit(0);
  }

  switch (command) {
    case "upload":
      if (!args[1]) { console.error("Error: local file path required"); process.exit(1); }
      await uploadFile(args[1], args[2]);
      break;
    case "upload-dir":
      if (!args[1]) { console.error("Error: directory path required"); process.exit(1); }
      await uploadDir(args[1], args[2]);
      break;
    case "download":
      if (!args[1] || !args[2]) { console.error("Error: remote key and local path required"); process.exit(1); }
      await downloadFile(args[1], args[2]);
      break;
    case "sync-db":
      await syncDb(args[1] || "./data");
      break;
    case "list":
      await listFiles(args[1]);
      break;
    case "delete":
      if (!args[1]) { console.error("Error: remote key required"); process.exit(1); }
      await deleteFile(args[1]);
      break;
    default:
      console.error("Unknown command: " + command);
      printUsage();
      process.exit(1);
  }
}

main().catch(function(err) {
  console.error("\nError: " + err.message);
  process.exit(1);
});
