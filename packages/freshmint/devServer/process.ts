import { spawn, ChildProcess } from 'child_process';

export type CloseHandler = (code: number) => void;
export type OutputHandler = (line: string) => void;

export type ProcessHandlers = {
  onClose?: CloseHandler;
  onStdout?: OutputHandler;
  onStderr?: OutputHandler;
};

export function spawnProcess(command: string, args: string[], handlers: ProcessHandlers): ChildProcess {
  const process = spawn(command, args);

  process.stdout.on('data', (data) => {
    const output = String(data);

    const lines = output.split('\n');

    for (const line of lines) {
      if (handlers.onStdout) {
        handlers.onStdout(line);
      }
    }
  });

  process.stderr.on('data', (data) => {
    const output = String(data);
    if (handlers.onStderr) {
      handlers.onStderr(output);
    }
  });

  process.on('close', (code) => {
    if (handlers.onClose) {
      handlers.onClose(code as number);
    }
  });

  return process;
}
