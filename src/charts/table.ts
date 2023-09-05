import { transparentColor } from '../settings';
import { Colors, Cols, Rows, Config } from '../types';

export function updateTable(
  table: HTMLTableElement,
  { cols: c, rows: r, colors, isTransposed }: Config
) {
  const [cols, rows] = isTransposed ? transposeTable(c, r) : [c, r];
  emptyTable(table);
  createTableHeader(table, cols);
  createTableBody(table, rows, cols, colors);
}

function transposeTable(cols: Cols, rows: Rows): [Cols, Rows] {
  const [[firstColId, firstColValue], ...restCols] = Object.entries(cols);
  const transposedCols: Cols = {
    0: firstColValue,
    ...Object.fromEntries(
      Object.entries(rows).map(([key, { values, colors }]) => [
        key,
        { colors, value: values[firstColId] },
      ])
    ),
  };
  const transposedRows: Rows = Object.fromEntries(
    restCols.map(([key, { value, colors }]) => [
      key,
      {
        colors,
        name: '',
        values: {
          0: value,
          ...Object.fromEntries(
            Object.entries(rows).map(([k, { values }]) => [k, values[key]])
          ),
        },
      },
    ])
  );

  return [transposedCols, transposedRows];
}

function createTableHeader(table: HTMLTableElement, cols: Cols) {
  const head = document.createElement(`thead`);
  const row = document.createElement(`tr`);
  let colIterator = 0;
  for (const colKey in cols) {
    colIterator += 1;
    const col = document.createElement(`th`);
    col.innerHTML = cols[colKey].value.replace(`|`, `<br>`);
    row.appendChild(col);
    colIterator === 1 && row.appendChild(col.cloneNode(true)); // duplicate the first column
  }
  head.appendChild(row);
  table.appendChild(head);
}

function createTableBody(
  table: HTMLTableElement,
  rows: Rows,
  cols: Cols,
  colors: Colors
) {
  const body = document.createElement(`tbody`);
  const styleCell = makeTableCellStyle(colors);
  const colsArr = Object.values(cols);
  let rowIterator = 0;
  for (const rowKey in rows) {
    rowIterator += 1;
    const rowEl = document.createElement(`tr`);
    const { values, colors: rowColorKey } = rows[rowKey];
    // skip empty rows
    if (Object.values(values).every((it) => !it)) continue;

    let colIterator = 0;
    for (const colKey in values) {
      const { colors: colColorKey } = colsArr[colIterator];
      colIterator += 1;
      const colEl = document.createElement(`td`);
      styleCell(colEl, rowColorKey, colColorKey, rowIterator % 2 === 0);
      const value = values[colKey];
      colEl.innerHTML =
        typeof value === 'string'
          ? value.replace(`|`, `<br>`)
          : value.toString();
      rowEl.appendChild(colEl);

      // duplicate first column
      colIterator === 1 && rowEl.appendChild(colEl.cloneNode(true));
    }
    body.appendChild(rowEl);
  }
  table.appendChild(body);
}

function makeTableCellStyle(colors: Colors) {
  if (!colors) return () => null;

  return (cell: HTMLTableCellElement, rowColorKey: string, colColorKey: string, isEven: boolean) => {
    const { start: rowBgColor, border: rowTxtColor } =
      colors[rowColorKey] || transparentColor;
    const {
      start: oddColor,
      end: evenColor,
      border: colTxtColor,
    } = colors[colColorKey] || transparentColor;
    // background logic
    if (rowBgColor.a)
      cell.style.backgroundColor = `rgba(${rowBgColor.r},${rowBgColor.g},${rowBgColor.b},${rowBgColor.a})`;
    if (isEven && evenColor.a) {
      cell.style.backgroundColor = `rgba(${evenColor.r},${evenColor.g},${evenColor.b},${evenColor.a})`;
    } else if (oddColor.a) {
      cell.style.backgroundColor = `rgba(${oddColor.r},${oddColor.g},${oddColor.b},${oddColor.a})`;
    }
    // text color logic
    if (rowTxtColor.a)
      cell.style.color = `rgba(${rowTxtColor.r},${rowTxtColor.g},${rowTxtColor.b},${rowTxtColor.a})`;
    if (colTxtColor.a)
      cell.style.color = `rgba(${colTxtColor.r},${colTxtColor.g},${colTxtColor.b},${colTxtColor.a})`;
  };
}

function emptyTable(table: HTMLTableElement) {
  while (table.firstChild) {
    table.removeChild(table.firstChild);
  }
}

function scrollTo(requestedPosition: number, el: HTMLElement) {
  const speed = 8;
  const scrollLeft = el.scrollLeft;
  const maxScroll = el.scrollWidth - el.offsetWidth;
  const position =
    requestedPosition < 0
      ? 0
      : requestedPosition > maxScroll
      ? maxScroll
      : requestedPosition;

  if (Math.abs(scrollLeft - position) > 1) {
    const diff = Math.abs(scrollLeft - position);
    const polarity = scrollLeft > position ? -1 : 1;
    el.scrollLeft =
      el.scrollLeft + polarity * (diff > speed ? diff / speed : 1);
    window.requestAnimationFrame(() => scrollTo(position, el));
    window.canClick = false;
  } else {
    window.canClick = true;
  }
}

export function renderTableTitle(
  text: string,
  wrapper: HTMLElement,
  step: number
): HTMLDivElement {
  wrapper.scrollLeft = wrapper.scrollWidth; // set scroll to the right
  window.canClick = true;
  const tableTitle = document.createElement(`div`);
  tableTitle.className = `table-header`;

  const leftButton = document.createElement(`button`);
  leftButton.innerText = `←`;
  leftButton.className = `hidden`;
  leftButton.addEventListener(`click`, () => {
    window.canClick && scrollTo(wrapper.scrollLeft - step, wrapper);
  });

  const rightButton = document.createElement(`button`);
  rightButton.innerText = `→`;
  rightButton.className = `hidden`;
  rightButton.addEventListener(`click`, () => {
    window.canClick && scrollTo(wrapper.scrollLeft + step, wrapper);
  });

  const title = document.createElement(`span`);
  title.innerText = text;

  tableTitle.appendChild(leftButton);
  tableTitle.appendChild(title);
  tableTitle.appendChild(rightButton);

  const toggleArrows = makeToggleArrows(leftButton, rightButton);
  wrapper.addEventListener(
    `scroll`,
    ({ target }) => target instanceof HTMLElement ? toggleArrows(target) : null
  );
  toggleArrows(wrapper);

  return tableTitle;
}

function makeToggleArrows(
  leftButton: HTMLButtonElement,
  rightButton: HTMLButtonElement
) {
  return (wrapperElement: HTMLElement) => {
    leftButton.classList.toggle(
      `hidden`,
      Math.abs(wrapperElement.scrollLeft) < 2
    );
    rightButton.classList.toggle(
      `hidden`,
      Math.abs(
        wrapperElement.scrollLeft +
          wrapperElement.offsetWidth -
          wrapperElement.scrollWidth
      ) < 2
    );
  };
}
