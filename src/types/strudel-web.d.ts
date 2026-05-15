declare module '@strudel/web' {
  export function initStrudel(opts?: { prebake?: () => unknown; [k: string]: unknown }): void;
  export function evaluate(code: string): Promise<unknown>;
  export function hush(): void;
  export function samples(src: string): Promise<unknown>;
  const _default: unknown;
  export default _default;
}
