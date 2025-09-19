import * as path from "@std/path";
import { promptMultipleSelect } from "@std/cli/unstable-prompt-multiple-select";

const extensions = promptMultipleSelect("Please select extensions (press space to select):", [".NEV", ".NEF"]) ?? [".NEV"];
console.log("extensions", extensions);

const photosPath = path.dirname(path.fromFileUrl(import.meta.url));
console.log("photosPath", photosPath);

const today = Temporal.Now.plainDateISO(Temporal.Now.timeZoneId()); // 2023-10-01
const dur = Temporal.PlainDate.from("2025-01-01").until(today, { largestUnit: "years", smallestUnit: "months" }).abs();

// console.log("dur", dur);
// console.log("days", dur.total("days"));

const durYears = dur.years;
console.log("years", durYears);
const durMonths = dur.months;
console.log("months", durMonths);

const years = Array.from({ length: durYears + 1 }, (_, i) => String(today.year - i)); // Change this to the years you want to search in
const monthsInCurrentYear = Array.from({ length: durMonths + 1 }, (_, i) => String(today.month - i).padStart(2, "0"));

// assume we're more likely to be looking for files that are more recent than older ones
// const years = ["2025"].reverse(); // Change this to the years you want to search in
const allMonths = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].reverse();

async function getFileInfo(fileName: string): Promise<Deno.FileInfo> {
  for (const year of years) {
    let months = allMonths;
    if (year === String(today.year)) {
      months = monthsInCurrentYear;
    }
    for (const month of months) {
      console.log("year", year, "month", month);
      const daysInMonth = Temporal.PlainDate.from(`${year}-${month}-01`).daysInMonth;
      for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = String(day).padStart(2, "0");
        for (const ext of extensions) {
          const filePathWithExt = path.join(photosPath, year, month, dayStr, fileName + ext);
          // console.log("filePathWithExt", filePathWithExt);
          try {
            const fileInfo = await Deno.stat(filePathWithExt);
            // console.log("fileInfo", fileInfo);
            return fileInfo;
          } catch {
            // ignore error if file not found
          }
        }
      }
    }
  }
  throw new Error(`File not found: ${fileName} with extensions ${extensions.join(", ")}`);
}
async function loop() {
  const input = prompt("Enter the file name: ")?.toLocaleUpperCase();

  if (!input) {
    console.error("No file name provided. Exiting.");
    return;
  }

  let fileName = input;
  if (/^\d{4}$/g.test(input)) {
    fileName = "DSC_" + input;
  }

  console.log("fileName", fileName);

  try {
    const fileInfo = await getFileInfo(fileName);
    const mtime = fileInfo.mtime;
    if (!mtime) {
      console.error("No modification time found for the file.");
      Deno.exit(1);
    }
    const formattedDate = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(mtime);
    console.log("Formatted Date:", formattedDate);
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
    }
  }

  await loop();
}

await loop();

// console.log("File Info:", fileInfo);
