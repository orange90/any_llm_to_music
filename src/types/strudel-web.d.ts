declare module '@strudel/web' {
  export function initStrudel(opts?: { prebake?: () => unknown; [k: string]: unknown }): void;
  export function evaluate(code: string): Promise<unknown>;
  export function hush(): void;
  export function samples(src: string): Promise<unknown>;
  const _default: unknown;
  export default _default;
}

declare global {
  interface StrudelMirrorLike {
    setCode: (code: string) => void;
    start?: () => void;
    stop: () => void;
    evaluate: (code?: string) => Promise<unknown> | unknown;
    toggle?: () => void;
    code?: string;
  }

  interface StrudelEditorElement extends HTMLElement {
    editor?: StrudelMirrorLike;
  }

  interface HTMLElementTagNameMap {
    'strudel-editor': StrudelEditorElement;
  }

  namespace JSX {
    interface IntrinsicElements {
      'strudel-editor': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        code?: string;
      };
    }
  }
}

export {};
