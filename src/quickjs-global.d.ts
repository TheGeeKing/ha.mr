declare const scriptArgs: string[];

declare module "qjs:std" {
  interface OutputStream {
    puts: (value: string) => void;
  }

  export const err: OutputStream;
  export const out: OutputStream;
  export function exit(exitCode: number): never;
}
