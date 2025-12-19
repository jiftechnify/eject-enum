import { createSpinner, type Spinner } from "nanospinner";

export interface ProgressLogger {
  start(numFiles: number): void;
  finish(): void;
  notifyFinishFile(): void;
  log(l: string): void;
}

export const initProgressLogger = (silent: boolean): ProgressLogger =>
  silent ? noopProgressLogger : new DefaultProgressLogger();

const progressText = (numFinished: number, numFiles: number): string =>
  `Ejecting... ${numFinished}/${numFiles} (${((numFinished / numFiles) * 100).toFixed(0)}%)`;

class DefaultProgressLogger implements ProgressLogger {
  #spinner: Spinner;

  #numFiles = 0;
  #numFinished = 0;

  constructor() {
    this.#spinner = createSpinner();
  }

  public start(numFiles: number) {
    this.#numFiles = numFiles;
    this.#spinner.start(progressText(0, this.#numFiles));
  }

  public finish() {
    this.#spinner.success({ text: "Ejection finished" });
  }

  public notifyFinishFile() {
    this.#numFinished++;
    this.#spinner.update(progressText(this.#numFinished, this.#numFiles));
  }

  public log(l: string) {
    this.#spinner.clear();

    console.log(l);

    this.#spinner.render();
  }
}

const noopProgressLogger: ProgressLogger = {
  start() {
    /* no-op */
  },
  finish() {
    /* no-op */
  },
  notifyFinishFile() {
    /* no-op */
  },
  log() {
    /* no-op */
  },
};
