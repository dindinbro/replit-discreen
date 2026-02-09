import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

interface S3Config {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  prefix: string;
}

function getS3Config(): S3Config | null {
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION || "auto";
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const prefix = process.env.S3_PREFIX || "";

  if (!bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return { endpoint: endpoint || "", region, bucket, accessKeyId, secretAccessKey, prefix };
}

function createS3Client(config: S3Config): S3Client {
  const clientConfig: any = {
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

export async function syncDatabasesFromS3(dataDir: string): Promise<string[]> {
  if (process.env.SKIP_S3_SYNC === "true") {
    console.log("[s3sync] SKIP_S3_SYNC=true — skipping remote sync (checked in syncDatabasesFromS3)");
    return [];
  }

  const skipLocations = [
    path.join(process.cwd(), ".skip-s3-sync"),
    path.resolve(__dirname, "..", ".skip-s3-sync"),
    path.resolve(__dirname, ".skip-s3-sync"),
    "/srv/discreen/.skip-s3-sync",
  ];
  for (const skipFile of skipLocations) {
    if (fs.existsSync(skipFile)) {
      console.log(`[s3sync] .skip-s3-sync file found at ${skipFile} — skipping remote sync`);
      return [];
    }
  }

  const config = getS3Config();
  if (!config) {
    console.log("[s3sync] S3 not configured — skipping remote sync");
    return [];
  }

  console.log(`[s3sync] Syncing databases from S3 bucket "${config.bucket}"...`);

  const client = createS3Client(config);
  const downloaded: string[] = [];

  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: config.bucket,
      Prefix: config.prefix,
    });

    const response = await client.send(listCommand);
    const objects = response.Contents || [];

    const dbFiles = objects.filter((obj) => obj.Key && obj.Key.endsWith(".db"));

    if (dbFiles.length === 0) {
      console.log("[s3sync] No .db files found in S3 bucket");
      return [];
    }

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    for (const obj of dbFiles) {
      const key = obj.Key!;
      const filename = path.basename(key);
      const localPath = path.join(dataDir, filename);

      const localExists = fs.existsSync(localPath);
      const localSize = localExists ? fs.statSync(localPath).size : 0;
      const remoteSize = obj.Size || 0;

      if (localExists && localSize === remoteSize) {
        console.log(`[s3sync] ${filename} already up to date (${remoteSize} bytes)`);
        continue;
      }

      console.log(`[s3sync] Downloading ${filename} (${(remoteSize / 1024 / 1024).toFixed(1)} MB)...`);

      const getCommand = new GetObjectCommand({
        Bucket: config.bucket,
        Key: key,
      });

      const getResponse = await client.send(getCommand);

      if (getResponse.Body) {
        const tmpPath = localPath + ".tmp";
        const writeStream = fs.createWriteStream(tmpPath);
        await pipeline(getResponse.Body as Readable, writeStream);
        fs.renameSync(tmpPath, localPath);
        console.log(`[s3sync] ${filename} downloaded successfully`);
        downloaded.push(filename);
      }
    }
  } catch (err) {
    console.error("[s3sync] Error syncing from S3:", err);
  }

  return downloaded;
}

export async function uploadFileToS3(localPath: string, remoteKey?: string): Promise<boolean> {
  const config = getS3Config();
  if (!config) {
    console.error("[s3sync] S3 not configured — cannot upload");
    return false;
  }

  const client = createS3Client(config);
  const filename = path.basename(localPath);
  const key = remoteKey || (config.prefix ? `${config.prefix}${filename}` : filename);

  try {
    const fileBuffer = fs.readFileSync(localPath);
    const sizeInMB = (fileBuffer.length / 1024 / 1024).toFixed(1);
    console.log(`[s3sync] Uploading ${filename} (${sizeInMB} MB) to ${key}...`);

    await client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: fileBuffer,
    }));

    console.log(`[s3sync] ${filename} uploaded successfully`);
    return true;
  } catch (err) {
    console.error(`[s3sync] Error uploading ${filename}:`, err);
    return false;
  }
}

export async function uploadDirectoryToS3(dirPath: string, remotePrefix?: string): Promise<string[]> {
  const config = getS3Config();
  if (!config) {
    console.error("[s3sync] S3 not configured — cannot upload");
    return [];
  }

  const prefix = remotePrefix ?? config.prefix;
  const uploaded: string[] = [];

  function getAllFiles(dir: string, baseDir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getAllFiles(fullPath, baseDir));
      } else {
        files.push(fullPath);
      }
    }
    return files;
  }

  const files = getAllFiles(dirPath, dirPath);
  console.log(`[s3sync] Found ${files.length} files to upload from ${dirPath}`);

  for (const filePath of files) {
    const relativePath = path.relative(dirPath, filePath);
    const key = prefix ? `${prefix}${relativePath}` : relativePath;
    const success = await uploadFileToS3(filePath, key);
    if (success) {
      uploaded.push(relativePath);
    }
  }

  console.log(`[s3sync] Upload complete: ${uploaded.length}/${files.length} files uploaded`);
  return uploaded;
}

export async function downloadFileFromS3(remoteKey: string, localPath: string): Promise<boolean> {
  const config = getS3Config();
  if (!config) {
    console.error("[s3sync] S3 not configured — cannot download");
    return false;
  }

  const client = createS3Client(config);

  try {
    console.log(`[s3sync] Downloading ${remoteKey}...`);
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
      await pipeline(response.Body as Readable, writeStream);
      fs.renameSync(tmpPath, localPath);
      const sizeInMB = (fs.statSync(localPath).size / 1024 / 1024).toFixed(1);
      console.log(`[s3sync] Downloaded ${remoteKey} (${sizeInMB} MB)`);
      return true;
    }
    return false;
  } catch (err) {
    console.error(`[s3sync] Error downloading ${remoteKey}:`, err);
    return false;
  }
}

export async function listS3Files(prefix?: string): Promise<{ key: string; size: number; lastModified?: Date }[]> {
  const config = getS3Config();
  if (!config) {
    console.error("[s3sync] S3 not configured — cannot list");
    return [];
  }

  const client = createS3Client(config);
  const searchPrefix = prefix ?? config.prefix;

  try {
    const response = await client.send(new ListObjectsV2Command({
      Bucket: config.bucket,
      Prefix: searchPrefix,
    }));

    return (response.Contents || []).map(obj => ({
      key: obj.Key || "",
      size: obj.Size || 0,
      lastModified: obj.LastModified,
    }));
  } catch (err) {
    console.error("[s3sync] Error listing files:", err);
    return [];
  }
}

export async function deleteFileFromS3(remoteKey: string): Promise<boolean> {
  const config = getS3Config();
  if (!config) {
    console.error("[s3sync] S3 not configured — cannot delete");
    return false;
  }

  const client = createS3Client(config);

  try {
    await client.send(new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: remoteKey,
    }));
    console.log(`[s3sync] Deleted ${remoteKey}`);
    return true;
  } catch (err) {
    console.error(`[s3sync] Error deleting ${remoteKey}:`, err);
    return false;
  }
}
