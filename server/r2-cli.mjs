import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

function getS3Config() {
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION || "auto";
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const prefix = process.env.S3_PREFIX || "";

  if (!bucket || !accessKeyId || !secretAccessKey) {
    console.error("Missing env vars: S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY");
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
  const config = getS3Config();
  const client = createS3Client(config);
  const filename = path.basename(localPath);
  const key = remoteKey || (config.prefix ? `${config.prefix}${filename}` : filename);

  const fileBuffer = fs.readFileSync(localPath);
  const sizeMB = (fileBuffer.length / 1024 / 1024).toFixed(1);
  console.log(`Uploading ${filename} (${sizeMB} MB) to ${key}...`);

  await client.send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: fileBuffer,
  }));

  console.log(`${filename} uploaded successfully`);
  return true;
}

function getAllFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

async function uploadDir(dirPath, remotePrefix) {
  const config = getS3Config();
  const prefix = remotePrefix ?? config.prefix;

  if (!fs.existsSync(dirPath)) {
    console.error(`Directory not found: ${dirPath}`);
    process.exit(1);
  }

  const files = getAllFiles(dirPath);
  console.log(`Found ${files.length} files to upload from ${dirPath}`);

  let uploaded = 0;
  for (const filePath of files) {
    const relativePath = path.relative(dirPath, filePath);
    const key = prefix ? `${prefix}${relativePath}` : relativePath;
    try {
      await uploadFile(filePath, key);
      uploaded++;
    } catch (err) {
      console.error(`Failed to upload ${relativePath}:`, err.message);
    }
  }

  console.log(`Upload complete: ${uploaded}/${files.length} files uploaded`);
}

async function downloadFile(remoteKey, localPath) {
  const config = getS3Config();
  const client = createS3Client(config);

  console.log(`Downloading ${remoteKey}...`);
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
    console.log(`Downloaded ${remoteKey} (${sizeMB} MB)`);
  }
}

async function syncDb(dataDir) {
  const config = getS3Config();
  const client = createS3Client(config);

  console.log(`Syncing .db files from bucket "${config.bucket}"...`);

  const response = await client.send(new ListObjectsV2Command({
    Bucket: config.bucket,
    Prefix: config.prefix,
  }));

  const objects = response.Contents || [];
  const dbFiles = objects.filter((obj) => obj.Key && obj.Key.endsWith(".db"));

  if (dbFiles.length === 0) {
    console.log("No .db files found in bucket");
    return;
  }

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  let downloaded = 0;
  for (const obj of dbFiles) {
    const key = obj.Key;
    const filename = path.basename(key);
    const localPath = path.join(dataDir, filename);

    const localExists = fs.existsSync(localPath);
    const localSize = localExists ? fs.statSync(localPath).size : 0;
    const remoteSize = obj.Size || 0;

    if (localExists && localSize === remoteSize) {
      console.log(`${filename} already up to date (${remoteSize} bytes)`);
      continue;
    }

    await downloadFile(key, localPath);
    downloaded++;
  }

  console.log(`Sync complete: ${downloaded} files downloaded`);
}

async function listFiles(prefix) {
  const config = getS3Config();
  const client = createS3Client(config);
  const searchPrefix = prefix ?? config.prefix;

  const response = await client.send(new ListObjectsV2Command({
    Bucket: config.bucket,
    Prefix: searchPrefix,
  }));

  const files = response.Contents || [];
  if (files.length === 0) {
    console.log("No files found");
    return;
  }

  console.log(`Found ${files.length} files:\n`);
  for (const f of files) {
    const sizeMB = ((f.Size || 0) / 1024 / 1024).toFixed(2);
    const date = f.LastModified ? f.LastModified.toISOString().slice(0, 19) : "unknown";
    console.log(`  ${f.Key}  (${sizeMB} MB, ${date})`);
  }
}

async function deleteFile(remoteKey) {
  const config = getS3Config();
  const client = createS3Client(config);

  await client.send(new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: remoteKey,
  }));
  console.log(`Deleted ${remoteKey}`);
}

const args = process.argv.slice(2);
const command = args[0];

function printUsage() {
  console.log(`
Discreen R2 CLI

Usage:
  node server/r2-cli.mjs <command> [options]

Commands:
  upload <local-path> [remote-key]     Upload a single file
  upload-dir <local-dir> [prefix]      Upload an entire directory
  download <remote-key> <local-path>   Download a single file
  sync-db <local-dir>                  Sync all .db files from R2
  list [prefix]                        List files in the bucket
  delete <remote-key>                  Delete a file from R2
`);
}

async function main() {
  if (!command || command === "help" || command === "--help") {
    printUsage();
    process.exit(0);
  }

  switch (command) {
    case "upload": {
      if (!args[1]) { console.error("Error: local file path required"); process.exit(1); }
      await uploadFile(args[1], args[2]);
      break;
    }
    case "upload-dir": {
      if (!args[1]) { console.error("Error: directory path required"); process.exit(1); }
      await uploadDir(args[1], args[2]);
      break;
    }
    case "download": {
      if (!args[1] || !args[2]) { console.error("Error: remote key and local path required"); process.exit(1); }
      await downloadFile(args[1], args[2]);
      break;
    }
    case "sync-db": {
      await syncDb(args[1] || "./data");
      break;
    }
    case "list": {
      await listFiles(args[1]);
      break;
    }
    case "delete": {
      if (!args[1]) { console.error("Error: remote key required"); process.exit(1); }
      await deleteFile(args[1]);
      break;
    }
    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
