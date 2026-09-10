'use client';

import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Underline as UnderlineIcon,
} from 'lucide-react';
import { LINE_HEIGHTS, LineHeight } from '@/lib/tiptap-line-height';
import { PreserveParagraphsPaste } from '@/lib/tiptap-preserve-paragraphs';
import { ensureNoteHtml } from '@/lib/note-html';

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 ${
        active ? 'bg-[#1a5fb4]/10 text-[#1a5fb4]' : ''
      }`}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Escribí o pegá la nota. Los párrafos se conservan.',
}: RichTextEditorProps) {
  const [mode, setMode] = useState<'visual' | 'html'>('visual');
  const [htmlDraft, setHtmlDraft] = useState(value);
  const lastEmitted = useRef(value);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Image.configure({ inline: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      LineHeight,
      PreserveParagraphsPaste,
      Link.configure({
        openOnClick: false,
        defaultProtocol: 'https',
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: ensureNoteHtml(value) || '<p></p>',
    editorProps: {
      attributes: {
        class:
          'prose-ucu min-h-[22rem] max-w-none px-4 py-3 text-[15px] outline-none',
      },
    },
    onUpdate: ({ editor: instance }) => {
      const html = instance.getHTML();
      lastEmitted.current = html;
      onChange(html);
      setHtmlDraft(html);
    },
  });

  useEffect(() => {
    if (!editor || mode === 'html') return;
    if (value === lastEmitted.current) return;
    const incoming = ensureNoteHtml(value) || '<p></p>';
    if (incoming === editor.getHTML()) {
      lastEmitted.current = value;
      return;
    }
    editor.commands.setContent(incoming, { emitUpdate: false });
    lastEmitted.current = incoming;
    setHtmlDraft(incoming);
  }, [editor, value, mode]);

  function applyHtmlMode(next: string) {
    setHtmlDraft(next);
    onChange(next);
  }

  function switchMode(next: 'visual' | 'html') {
    if (next === mode) return;
    if (next === 'html') {
      const html = editor?.getHTML() || htmlDraft;
      setHtmlDraft(html);
      onChange(html);
    } else {
      const html = ensureNoteHtml(htmlDraft) || '<p></p>';
      editor?.commands.setContent(html, { emitUpdate: false });
      onChange(html);
    }
    setMode(next);
  }

  function setLink() {
    if (!editor) return;
    const previous = editor.getAttributes('link').href as string | undefined;
    const next = window.prompt('Link', previous || 'https://');
    if (next === null) return;
    const href = next.trim();
    if (!href) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
  }

  function setImage() {
    if (!editor) return;
    const src = window.prompt('URL de la imagen');
    if (!src?.trim()) return;
    editor.chain().focus().setImage({ src: src.trim() }).run();
  }

  const currentLineHeight =
    (editor?.getAttributes('paragraph').lineHeight as string | undefined) ||
    (editor?.getAttributes('heading').lineHeight as string | undefined) ||
    '';

  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-[#1a5fb4]">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
        <ToolbarButton
          label="Negrita"
          active={editor?.isActive('bold')}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Cursiva"
          active={editor?.isActive('italic')}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Subrayado"
          active={editor?.isActive('underline')}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Tachado"
          active={editor?.isActive('strike')}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-slate-200" />

        <ToolbarButton
          label="Título"
          active={editor?.isActive('heading', { level: 2 })}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Subtítulo"
          active={editor?.isActive('heading', { level: 3 })}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Lista"
          active={editor?.isActive('bulletList')}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Lista numerada"
          active={editor?.isActive('orderedList')}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Cita"
          active={editor?.isActive('blockquote')}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-slate-200" />

        <ToolbarButton
          label="Alinear a la izquierda"
          active={editor?.isActive({ textAlign: 'left' })}
          disabled={!editor}
          onClick={() => editor?.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Centrar"
          active={editor?.isActive({ textAlign: 'center' })}
          disabled={!editor}
          onClick={() => editor?.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Alinear a la derecha"
          active={editor?.isActive({ textAlign: 'right' })}
          disabled={!editor}
          onClick={() => editor?.chain().focus().setTextAlign('right').run()}
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Justificar"
          active={editor?.isActive({ textAlign: 'justify' })}
          disabled={!editor}
          onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
        >
          <AlignJustify className="h-4 w-4" />
        </ToolbarButton>

        <label className="ml-1 inline-flex items-center gap-1.5 text-xs text-slate-600">
          <span className="sr-only">Interlineado</span>
          <select
            disabled={!editor}
            value={currentLineHeight}
            onChange={(event) => {
              const next = event.target.value;
              if (!next) {
                editor?.chain().focus().unsetLineHeight().run();
                return;
              }
              editor?.chain().focus().setLineHeight(next).run();
            }}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-[#1a5fb4]"
          >
            <option value="">Interlineado</option>
            {LINE_HEIGHTS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <span className="mx-1 h-5 w-px bg-slate-200" />

        <ToolbarButton label="Link" active={editor?.isActive('link')} disabled={!editor} onClick={setLink}>
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Imagen por URL" disabled={!editor} onClick={setImage}>
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>

        <div className="ml-auto flex rounded-md border border-slate-200 bg-white p-0.5">
          <button
            type="button"
            onClick={() => switchMode('visual')}
            className={`rounded px-2 py-1 text-xs font-medium ${
              mode === 'visual' ? 'bg-[#1a5fb4] text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Visual
          </button>
          <button
            type="button"
            onClick={() => switchMode('html')}
            className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${
              mode === 'html' ? 'bg-[#1a5fb4] text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Code2 className="h-3 w-3" />
            HTML
          </button>
        </div>
      </div>

      {mode === 'html' ? (
        <textarea
          value={htmlDraft}
          onChange={(event) => applyHtmlMode(event.target.value)}
          rows={18}
          className="w-full resize-y px-4 py-3 font-mono text-sm outline-none"
          placeholder="HTML de la nota"
        />
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  );
}
