import { parseArgs } from "@std/cli/parse-args";
import { format } from "@std/fmt/bytes";
import { exists } from "@std/fs/exists";
import * as Ansi from "@std/cli/unstable-ansi";
import { getDiskByLabel } from "./get-disk-by-label.ts";

const sourceDriveLetter = await getDiskByLabel("NIKON Z6_3");
if (!sourceDriveLetter) {
  throw "Memory card not found. Is it still in the camera?";
}
const targetDriveLetter = await getDiskByLabel("Gamma");
if (!targetDriveLetter) {
  throw "Unable to find Gamma drive";
}

// console.log(`Found source directory: ${sourceDriveLetter}`);
// console.log(`Found target directory: ${targetDriveLetter}`);
const dcimDir = `${sourceDriveLetter}:\\DCIM`;

const sourceDirs = [];

const args = parseArgs(Deno.args, {
  boolean: ["dry-run", "delete", "red"],
  string: ["exclude"],
  collect: ["exclude"],
  default: {
    red: true,
    exclude: [".THM", ".WAV", ".XMP", ".JPG", ".MOV", ".MP4"],
  }
});

let moveCount = 0;
let deleteCount = 0;

for await (const dirEntry of Deno.readDir(dcimDir)) {
  if (dirEntry.isDirectory && /\d{3}NZ6_3/.test(dirEntry.name)) {
    console.log(`Found source directory: ${dirEntry.name}`);
    const sourceDir = `${dcimDir}\\${dirEntry.name}`;
    sourceDirs.push(sourceDir);
    for await (const dirEntry of Deno.readDir(sourceDir)) {
      if (dirEntry.isFile && !dirEntry.name.endsWith(".DAT")) {
        if (args["exclude"] && args.exclude.some((ex) => dirEntry.name.endsWith(ex))) {
          continue;
        }
        let targetName = dirEntry.name;
        if (args["red"]) {
          targetName = targetName.replace(/\.NEV$/, ".R3D");
        }
        const fileInfo = await Deno.stat(`${sourceDir}\\${dirEntry.name}`);
        const date = fileInfo.mtime;
        if (!date) {
          console.log(dirEntry.name, "No date found");
          continue;
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");

        const day = String(date.getDate()).padStart(2, "0");
        // console.log(`Formatted Date: ${year}-${month}-${day}`);

        const targetDir = `${targetDriveLetter}:\\Photos\\${year}\\${month}\\${day}`;
        await Deno.mkdir(targetDir, { recursive: true });

        if (!(await exists(`${targetDir}\\${targetName}`))) {
          const message = `Moving ${targetName} to ${targetDir} (${format(fileInfo.size)}) `;
          console.log(message + "🔜");
          if (!args["dry-run"]) {
            await Deno.copyFile(`${sourceDir}\\${dirEntry.name}`, `${targetDir}\\${targetName}`);
            moveCount++;
          }
          console.log(Ansi.moveCursorUp() + Ansi.setCursorColumn(message.length + 1) + "✅  ");
        }
        if (args["delete"]) {
          const message = `Deleting ${dirEntry.name} from ${sourceDir} `;
          console.log(message + "🔜");
          if (!args["dry-run"]) {
            await Deno.remove(`${sourceDir}\\${dirEntry.name}`);
            deleteCount++;
          }
          console.log(Ansi.moveCursorUp() + Ansi.setCursorColumn(message.length + 1) + "✅  ");

          // console.log(`Deleted ${dirEntry.name} from ${sourceDir}`);
        }
      }
    }
  }
}

console.log(`Moved ${moveCount} files to ${targetDriveLetter}:\\Photos\nDeleted ${deleteCount} files from ${sourceDirs.join(", ")}\n`);
