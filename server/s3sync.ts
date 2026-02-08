import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
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
