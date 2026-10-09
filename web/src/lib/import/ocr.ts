let workerPromise: ReturnType<typeof createOcrWorker> | null = null;

async function createOcrWorker() {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(["chi_tra", "eng"], 1, {
    logger: () => {},
  });
  return worker;
}

async function getWorker() {
  if (!workerPromise) workerPromise = createOcrWorker();
  return workerPromise;
}

export async function recognizeImageFile(file: File): Promise<string> {
  const worker = await getWorker();
  const {
    data: { text },
  } = await worker.recognize(file);
  return text;
}

export async function recognizeImageFiles(files: File[]): Promise<string> {
  const parts: string[] = [];
  for (const file of files) {
    parts.push(await recognizeImageFile(file));
  }
  return parts.join("\n\n");
}
