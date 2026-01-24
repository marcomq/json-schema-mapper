export function h(tag: string, attrs: { [key: string]: any }, ...children: (string | Node)[]): HTMLElement {
  const el = document.createElement(tag);

  for (const key in attrs) {
    if (key === 'dangerouslySetInnerHTML') {
      el.innerHTML = attrs[key];
    } else if (key.startsWith('on') && typeof attrs[key] === 'function') {
      el.addEventListener(key.substring(2).toLowerCase(), attrs[key]);
    } else if (key === 'className') {
      el.setAttribute('class', attrs[key]);
    } else {
      el.setAttribute(key, attrs[key]);
    }
  }

  for (const child of children) {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else if (child) {
      el.appendChild(child);
    }
  }

  return el;
}
