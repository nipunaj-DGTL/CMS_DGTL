import Link from 'next/link';
import type { ReactNode } from 'react';

type LexicalNode = {
  children?: LexicalNode[];
  fields?: { newTab?: boolean; url?: string };
  format?: number | string;
  tag?: string;
  text?: string;
  type?: string;
  url?: string;
};

const safeURL = (value: string): boolean => /^(\/(?!\/)|https:\/\/|mailto:|tel:)/i.test(value);

const renderNode = (node: LexicalNode, key: string): ReactNode => {
  if (typeof node.text === 'string') {
    let text: ReactNode = node.text;
    const format = Number(node.format ?? 0);
    if (format & 1) text = <strong>{text}</strong>;
    if (format & 2) text = <em>{text}</em>;
    if (format & 8) text = <u>{text}</u>;
    return <span key={key}>{text}</span>;
  }

  const children = (node.children ?? []).map((child, index) => renderNode(child, `${key}-${index}`));
  switch (node.type) {
    case 'heading':
      if (node.tag === 'h2') return <h2 key={key}>{children}</h2>;
      if (node.tag === 'h3') return <h3 key={key}>{children}</h3>;
      return <h4 key={key}>{children}</h4>;
    case 'list':
      return node.tag === 'ol' ? <ol key={key}>{children}</ol> : <ul key={key}>{children}</ul>;
    case 'listitem':
      return <li key={key}>{children}</li>;
    case 'link': {
      const url = node.fields?.url ?? node.url ?? '';
      return safeURL(url) ? (
        <Link
          href={url}
          key={key}
          rel={node.fields?.newTab ? 'noopener noreferrer' : undefined}
          target={node.fields?.newTab ? '_blank' : undefined}
        >
          {children}
        </Link>
      ) : <span key={key}>{children}</span>;
    }
    case 'quote':
      return <blockquote key={key}>{children}</blockquote>;
    case 'paragraph':
      return <p key={key}>{children}</p>;
    default:
      return <span key={key}>{children}</span>;
  }
};

export function CMSRichText({ content }: { content: unknown }) {
  const root = content && typeof content === 'object' && 'root' in content
    ? (content as { root?: LexicalNode }).root
    : content as LexicalNode | null;
  return <div>{root ? renderNode(root, 'root') : null}</div>;
}
