import { uploadFileToS3, uploadDirectoryToS3, downloadFileFromS3, listS3Files, deleteFileFromS3, syncDatabasesFromS3 } from "./s3sync";

const args = process.argv.slice(2);
const command = args[0];

function printUsage() {
  console.log(`
Discreen R2 CLI - Manage files in Cloudflare R2

Usage:
  npx tsx server/r2-cli.ts <command> [options]

Commands:
  upload <local-path> [remote-key]     Upload a single file
  upload-dir <local-dir> [prefix]      Upload an entire directory
  download <remote-key> <local-path>   Download a single file
  sync-db <local-dir>                  Sync all .db files from R2 to local dir
  list [prefix]                        List files in the bucket
  delete <remote-key>                  Delete a file from R2

Environment variables required:
  S3_ENDPOINT          R2 endpoint (https://<account-id>.r2.cloudflarestorage.com)
  S3_BUCKET            Bucket name (discreen)
  S3_ACCESS_KEY_ID     R2 access key
  S3_SECRET_ACCESS_KEY R2 secret key
  S3_REGION            Region (default: auto)
  S3_PREFIX            Optional key prefix

Examples:
  npx tsx server/r2-cli.ts upload ./data/index.db
  npx tsx server/r2-cli.ts upload ./data/index.db databases/index.db
  npx tsx server/r2-cli.ts upload-dir ./data databases/
  npx tsx server/r2-cli.ts download index.db ./data/index.db
  npx tsx server/r2-cli.ts sync-db ./data
  npx tsx server/r2-cli.ts list
  npx tsx server/r2-cli.ts list databases/
  npx tsx server/r2-cli.ts delete old-file.db
`);
}

async function main() {
  if (!command || command === "help" || command === "--help") {
    printUsage();
    process.exit(0);
  }

  switch (command) {
    case "upload": {
      const localPath = args[1];
      const remoteKey = args[2];
      if (!localPath) {
        console.error("Error: local file path required");
        process.exit(1);
      }
      const ok = await uploadFileToS3(localPath, remoteKey);
      process.exit(ok ? 0 : 1);
      break;
    }

    case "upload-dir": {
      const dirPath = args[1];
      const prefix = args[2];
      if (!dirPath) {
        console.error("Error: directory path required");
        process.exit(1);
      }
      const uploaded = await uploadDirectoryToS3(dirPath, prefix);
      console.log(`Uploaded ${uploaded.length} files`);
      process.exit(uploaded.length > 0 ? 0 : 1);
      break;
    }

    case "download": {
      const remoteKey = args[1];
      const localPath = args[2];
      if (!remoteKey || !localPath) {
        console.error("Error: remote key and local path required");
        process.exit(1);
      }
      const ok = await downloadFileFromS3(remoteKey, localPath);
      process.exit(ok ? 0 : 1);
      break;
    }

    case "sync-db": {
      const dataDir = args[1] || "./data";
      const downloaded = await syncDatabasesFromS3(dataDir);
      console.log(`Synced ${downloaded.length} database files`);
      process.exit(0);
      break;
    }

    case "list": {
      const prefix = args[1];
      const files = await listS3Files(prefix);
      if (files.length === 0) {
        console.log("No files found");
      } else {
        console.log(`Found ${files.length} files:\n`);
        for (const f of files) {
          const sizeMB = (f.size / 1024 / 1024).toFixed(2);
          const date = f.lastModified ? f.lastModified.toISOString().slice(0, 19) : "unknown";
          console.log(`  ${f.key}  (${sizeMB} MB, ${date})`);
        }
      }
      process.exit(0);
      break;
    }

    case "delete": {
      const remoteKey = args[1];
      if (!remoteKey) {
        console.error("Error: remote key required");
        process.exit(1);
      }
      const ok = await deleteFileFromS3(remoteKey);
      process.exit(ok ? 0 : 1);
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
