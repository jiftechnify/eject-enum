import ora, { Ora } from "ora";

const progressText = (numFinished: number, numFiles: number): string =>
  `Ejecting... ${numFinished}/${numFiles} (${(
    (numFinished / numFiles) *
    100
  ).toFixed(0)}%)`;

export class ProgressLogger {
  #spinner: Ora;

  #numFiles: number;
  #numFinished = 0;

  constructor(numFiles: number) {
    this.#numFiles = numFiles;
    this.#spinner = ora(progressText(this.#numFinished, this.#numFiles));
  }

  public start() {
    this.#spinner.render();
  }

  public finish() {
    this.#spinner.succeed("Ejection finished");
  }

  public notifyFinishFile() {
    this.#numFinished++;
    this.#spinner.text = progressText(this.#numFinished, this.#numFiles);
    this.#spinner.render();
  }

  public log(l: string) {
    this.#spinner.clear();

    console.log(l);

    this.#spinner.render();
  }
}
