"use client";

const BLOCK_TAGS = ["P", "DIV", "LI", "BR", "UL", "OL"];
const HTML_TAG_REGEX = /<\/?[a-z][\s\S]*>/i;

const normalizeLineBreaks = (html: string): string => {
  return html.replace(/(<div><br><\/div>)+/gi, "<div></div>");
};

export const sanitizeReportHtml = (raw: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, "text/html");

  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
  const nodesToRemove: Element[] = [];

  while (walker.nextNode()) {
    const el = walker.currentNode as Element;
    if (!BLOCK_TAGS.includes(el.tagName)) {
      el.removeAttribute("style");
      el.removeAttribute("class");
    }
    if (el.tagName === "SPAN" && !el.textContent?.trim()) {
      nodesToRemove.push(el);
    }
  }

  nodesToRemove.forEach((node) => node.remove());

  return normalizeLineBreaks(doc.body.innerHTML.trim());
};

export const renderReportContent = (raw: string): string => {
  if (!raw) return "";
  if (HTML_TAG_REGEX.test(raw)) return raw;
  return raw.replace(/\n/g, "<br />");
};
