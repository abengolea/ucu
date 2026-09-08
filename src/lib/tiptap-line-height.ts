import { Extension } from '@tiptap/core';

export const LINE_HEIGHTS = [
  { value: '1.4', label: 'Compacto', className: 'lh-1_4' },
  { value: '1.6', label: 'Cómodo', className: 'lh-1_6' },
  { value: '1.75', label: 'Normal', className: 'lh-1_75' },
  { value: '2', label: 'Holgado', className: 'lh-2' },
  { value: '2.4', label: 'Muy holgado', className: 'lh-2_4' },
] as const;

function classForLineHeight(value: string): string | null {
  return LINE_HEIGHTS.find((item) => item.value === value)?.className ?? null;
}

function lineHeightFromClassList(className: string): string | null {
  const match = LINE_HEIGHTS.find((item) => className.split(/\s+/).includes(item.className));
  return match?.value ?? null;
}

function normalizeLineHeight(raw: string | null | undefined): string | null {
  if (!raw || raw === 'normal') return null;
  const numeric = Number.parseFloat(raw);
  if (!Number.isFinite(numeric)) return raw;
  const closest = LINE_HEIGHTS.reduce((best, item) => {
    const current = Math.abs(Number.parseFloat(item.value) - numeric);
    const previous = Math.abs(Number.parseFloat(best.value) - numeric);
    return current < previous ? item : best;
  });
  return closest.value;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    lineHeight: {
      setLineHeight: (lineHeight: string) => ReturnType;
      unsetLineHeight: () => ReturnType;
    };
  }
}

export const LineHeight = Extension.create({
  name: 'lineHeight',

  addOptions() {
    return {
      types: ['paragraph', 'heading'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) =>
              normalizeLineHeight(element.style.lineHeight) ||
              lineHeightFromClassList(element.getAttribute('class') || ''),
            renderHTML: (attributes) => {
              const className = classForLineHeight(attributes.lineHeight);
              if (!className) return {};
              return { class: className };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLineHeight:
        (lineHeight: string) =>
        ({ commands }) =>
          this.options.types.every((type: string) =>
            commands.updateAttributes(type, { lineHeight })
          ),
      unsetLineHeight:
        () =>
        ({ commands }) =>
          this.options.types.every((type: string) =>
            commands.resetAttributes(type, 'lineHeight')
          ),
    };
  },
});
