declare module "react-syntax-highlighter" {
  import type { ComponentType, CSSProperties, ReactNode } from "react";

  export type SyntaxHighlighterProps = {
    children?: ReactNode;
    language?: string;
    style?: Record<string, CSSProperties>;
    customStyle?: CSSProperties;
    codeTagProps?: { style?: CSSProperties; className?: string };
    wrapLongLines?: boolean;
    showLineNumbers?: boolean;
  };

  export const Prism: ComponentType<SyntaxHighlighterProps>;
}

declare module "react-syntax-highlighter/dist/esm/styles/prism" {
  import type { CSSProperties } from "react";

  export const oneDark: Record<string, CSSProperties>;
  export const oneLight: Record<string, CSSProperties>;
}
