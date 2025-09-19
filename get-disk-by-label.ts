let disks:
  | {
      DriveLetter: string;
      FileSystemLabel: string;
      FileSystemType: string;
    }[]
  | undefined = undefined;
async function listDisks() {
  console.log("Listing disks");
  const command = new Deno.Command("powershell", {
    args: ["Get-Volume", "|", "Select-Object DriveLetter, FileSystemLabel, FileSystemType", "|", "ConvertTo-Json"],
  });
  const { code, stdout, stderr } = await command.output();
  const stderrText = new TextDecoder().decode(stderr).trim();
  const stdoutText = new TextDecoder().decode(stdout).trim();
  if (code !== 0) {
    throw new Error(`Exit code: ${code}`);
  }
  if (stderrText) {
    throw new Error(`Stderr: ${stderrText}`);
  }
  disks = JSON.parse(stdoutText);
  // console.log("disks", disks);
  console.log("Disks listed");
}

export async function getDiskByLabel(label: string): Promise<string | null> {
  if (!disks) {
    await listDisks();
  }
  if (!disks) {
    throw new Error("No disks found");
  }
  const trimmedLabel = label.trim();
  const d = disks.find((disk) => disk.FileSystemLabel.trim() === trimmedLabel);
  if (!d) {
    return null;
  }
  return d.DriveLetter;
}
