import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { looksLikeHtmlBlocks, normalizePastedHtml, paragraphsFromPlainText } from '@/lib/note-html';

export const PreserveParagraphsPaste = Extension.create({
  name: 'preserveParagraphsPaste',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('preserveParagraphsPaste'),
        props: {
          handlePaste: (_view, event) => {
            const clipboard = event.clipboardData;
            if (!clipboard) return false;

            const html = clipboard.getData('text/html').trim();
            const text = clipboard.getData('text/plain');

            const insert = (htmlContent: string) => {
              const chain = this.editor.chain().focus();
              if (this.editor.isEmpty) {
                chain.setContent(htmlContent).run();
                return;
              }
              chain.insertContent(htmlContent).run();
            };

            if (html) {
              const hasDoubleBreaks = /(<br\s*\/?>\s*){2,}/i.test(html);
              if (looksLikeHtmlBlocks(html) && !hasDoubleBreaks) return false;
              const normalized = normalizePastedHtml(html);
              if (!normalized) return false;
              insert(normalized);
              return true;
            }

            if (!text.includes('\n')) return false;
            insert(paragraphsFromPlainText(text));
            return true;
          },
        },
      }),
    ];
  },
});
