import {
  colors,
  fontAspectRatio,
  fontFamilyPrimary,
  fontSize,
  labelOffset,
  margin,
  symbolRatio,
} from './settings';
import {
  axisBottom,
  axisRight,
  format,
  scaleBand,
  scaleLinear,
  select,
  Selection,
} from 'd3';
import { redrawBarChart } from './charts/barChart';
import { redrawLineChart } from './charts/lineChart';
import { redrawDoughnutChart } from './charts/doughnutChart';
import { getMaxLength, isNumeric, parseToNumber, sortData } from './utils';
import { renderTableTitle, updateTable } from './charts/table';
import { createValueFormatter, setFormatLocale } from './format';
import {
  Chart,
  ChartType,
  Config,
  Locale,
  RowDatum,
  Rows,
  ValueDatum,
} from './types';

/*
 * Chart General
 * */
export function isBarChart(type: ChartType): boolean {
  return type === ChartType.BAR;
}
export function isDoughnutChart(type: ChartType): boolean {
  return type === ChartType.DOUGHNUT;
}

export function isLineChart(type: ChartType): boolean {
  return type === ChartType.LINE;
}
export function isTable(type: ChartType) {
  return type === ChartType.TABLE;
}
export function isChart(type: ChartType): boolean {
  return !isTable(type);
}

export function getChartWidth(state: Config) {
  return state.width - getChartLeftMargin(state);
}

export function getChartHeight(state: Config) {
  return state.height - getChartBottomMargin(state);
}

export function getChartLeftMargin({ rows, chartType, verticalLabel }: Config) {
  if (isDoughnutChart(chartType)) return 0;
  return (
    getMaxLength(
      Object.values(rows).map((row) => ({ values: Object.values(row.values) }))
    ) *
      fontSize *
      fontAspectRatio +
    (verticalLabel ? labelOffset : 0)
  );
}

export function getChartTopMargin({ chartType }: Config) {
  if (isDoughnutChart(chartType)) return 0;
  return margin.top;
}

export function getChartBottomMargin({ chartType }: Config) {
  if (isDoughnutChart(chartType)) return 0;
  return margin.bottom + labelOffset;
}

export function getMaxData(rows: Rows): ValueDatum[] {
  const maxValues: Record<string, string | number> = {};
  Object.keys(rows).forEach((rowKey) => {
    Object.keys(rows[rowKey].values).forEach((valueKey) => {
      maxValues[valueKey] =
        parseToNumber(maxValues[valueKey]) >
        parseToNumber(rows[rowKey].values[valueKey])
          ? maxValues[valueKey]
          : rows[rowKey].values[valueKey];
    });
  });
  return Object.entries(maxValues);
}

export function getRowData(rows: Rows): RowDatum[] {
  return Object.entries(rows);
}

export function getValueData(rows: Rows): ValueDatum[] {
  const [rowKey] = Object.keys(rows);
  return Object.entries(rows[rowKey].values);
}

// export function getChartSpecificData(
//   { chartType, rows }: Config,
//   forScales = true
// ) {
//   if (isLineChart(chartType)) {
//     if (!forScales) return getRowData(rows);
//     return getMaxData(rows);
//   }
//   return getValueData(rows);
// }

export function prepareChart(
  wrapper: Selection<HTMLElement, any, any, any>,
  state: Config
) {
  const xAxis = createXAxis(state);
  const yAxis = createYAxis(state);
  const svg = wrapper
    .append(`svg`)
    .attr(`viewBox`, `0 0 ${state.width} ${state.height}`)
    .attr(`fontStyle`, `normal`)
    .attr(`fontFamily`, fontFamilyPrimary);
  const chart = svg
    .append(`g`)
    .attr(
      `transform`,
      `translate(${getChartLeftMargin(state)}, ${getChartTopMargin(state)})`
    );
  chart.append(`g`).attr(`class`, `axis axis--y`).call(yAxis);
  chart
    .append(`g`)
    .attr(`class`, `axis axis--x`)
    .attr(`transform`, `translate(0, ${getChartHeight(state)})`)
    .call(xAxis);
  chart.append(`defs`);
  return chart;
}

export function createXAxis(state: Config) {
  if (isDoughnutChart(state.chartType)) return () => null;

  const scale = createXScale(state);

  return (group: Selection<SVGGElement, any, any, any>) => {
    const axis = axisBottom(scale).tickSize(0);
    group.call(axis);
    group.select(`.domain`).remove();
    const text = group
      .selectAll<SVGTextElement, string>(`.tick text`)
      .attr(`font-size`, fontSize)
      .attr(`font-family`, fontFamilyPrimary)
      .attr(`dy`, 16)
      .attr(`fill`, colors.label)
      .text(``);

    text
      .append(`tspan`)
      .attr(`dy`, `1.4em`)
      .attr(`x`, `0`)
      .text((key) => getLegendLine(state.cols[key].value, state.locale, 0));

    text
      .append(`tspan`)
      .attr(`dy`, `1.4em`)
      .attr(`x`, `0`)
      .text((key) => getLegendLine(state.cols[key].value, state.locale, 1));

    text
      .append(`tspan`)
      .attr(`dy`, `1.4em`)
      .attr(`x`, `0`)
      .text((key) => getLegendLine(state.cols[key].value, state.locale, 2));
  };
}

function getLegendLine(value: string, locale: Locale, index: number) {
  const [alfa, beta, gama, delta] = value
    .split(/\.|\s|\.\s|\.&nbsp;|&nbsp;/)
    .filter(Boolean);
  const isDate = [alfa, beta, gama].every((i) => parseInt(i, 10));
  if (isDate)
    return (
      locale === `cs`
        ? [`${alfa}. ${beta}.`, gama, delta]
        : [`${alfa}.${beta}.`, gama, delta]
    )[index];
  return [alfa, beta, gama, delta][index];
}

export function createYAxis(state: Config) {
  setFormatLocale(state.locale);

  if (isDoughnutChart(state.chartType)) return () => null;

  const scale = createYScale(state);
  const set: ValueDatum[] = isLineChart(state.chartType)
    ? getMaxData(state.rows)
    : getValueData(state.rows);
  const chartWidth = getChartWidth(state);

  return (group: Selection<SVGGElement, any, any, any>) => {
    const axis = axisRight(scale).tickSize(chartWidth).tickPadding(0);
    group.call(axis);
    group.select(`.domain`).remove();
    group
      .selectAll<SVGLineElement, number>(`.tick line`)
      .attr(`opacity`, (d: number) =>
        d > Math.max(...set.map(([, val]) => parseToNumber(val))) ? 0 : 1
      )
      .attr(`stroke`, colors.tick);

    group
      .selectAll<SVGLineElement, number>(`.tick text`)
      .text((d: number) => format(`,`)(d))
      .attr(`opacity`, (d: number) =>
        d > Math.max(...set.map(([, val]) => parseToNumber(val))) ? 0 : 1
      )
      .attr(`font-size`, fontSize)
      .attr(`font-family`, fontFamilyPrimary)
      .attr(`fill`, colors.label)
      .attr(`x`, -10)
      .attr(`dy`, 6)
      .attr(`text-anchor`, `end`);
  };
}

export function createXScale(state: Config) {
  const set = getValueData(state.rows);
  return scaleBand()
    .domain(set.map(([key]) => key))
    .rangeRound([0, getChartWidth(state)])
    .padding(isBarChart(state.chartType) ? 0.33 : 0);
}

export function createYScale(state: Config) {
  const { rows, chartType } = state;
  const allValues = Object.values(rows)
    .reduce(
      (acc: Array<number>, curr) =>
        acc.concat(Object.values(curr.values).map(parseToNumber)),
      []
    )
    .filter(isNumeric);

  // upperBound ratio (sufficient padding top hack)
  let ratio = 1;
  if (isBarChart(chartType)) {
    const xScale = createXScale(state);
    const symbolHeight = xScale.bandwidth() * symbolRatio;
    const height = getChartHeight(state);
    ratio = ((height + symbolHeight) / height) * 1.1;
  } else if (isLineChart(chartType)) {
    ratio = 1.05;
  }

  const lowerBound = isLineChart(chartType) ? Math.min(...allValues) : 0;
  const upperBound = Math.max(...allValues) * ratio;

  return scaleLinear()
    .domain([lowerBound, upperBound])
    .range([getChartHeight(state), 0]);
}

export function renderChart(state: Config, chart: Chart) {
  setFormatLocale(state.locale);

  if (isBarChart(state.chartType))
    return redrawBarChart(
      chart,
      getValueData(state.rows),
      {
        x: createXScale(state),
        y: createYScale(state),
      },
      state
    );

  if (isLineChart(state.chartType))
    return redrawLineChart(
      chart,
      getRowData(state.rows),
      {
        x: createXScale(state),
        y: createYScale(state),
      },
      state
    );

  if (isDoughnutChart(state.chartType))
    return redrawDoughnutChart(chart, getValueData(state.rows), state);

  return true;
}

export function renderHeader(
  { title: titleText, subtitle: subtitleText }: Config,
  element: HTMLElement
) {
  if (!titleText && !subtitleText) return;
  const header = document.createElement(`header`);
  header.className = `header`;
  const title = document.createElement(`h1`);
  const subtitle = document.createElement(`h2`);
  title.innerHTML = titleText;
  subtitleText.split(`|`).forEach((part) => {
    const span = document.createElement(`span`);
    span.innerHTML = part.trim();
    subtitle.appendChild(span);
  });
  header.appendChild(title);
  header.appendChild(subtitle);
  element.insertAdjacentElement(`afterbegin`, header);
}

export function renderChartFooter(
  {
    cols,
    colors: colorMap,
    unit,
    displayLegend,
    sortType,
    sortDirection,
    locale,
    decimalPlaces,
    rows,
  }: Config,
  element: HTMLElement
) {
  if (!displayLegend) return false;
  const footer = document.createElement(`footer`);
  footer.className = `footer`;
  const valueFormat = createValueFormatter(decimalPlaces);
  const set = getValueData(rows);
  set
    .sort(sortData(sortType, sortDirection, cols))
    .forEach(([colKey, value]) => {
      const { colors: colorKey, value: label } = cols[colKey];
      const {
        border: { r, g, b },
      } = colorMap[colorKey];

      const lineElem = document.createElement(`div`);
      lineElem.className = `line`;

      const colorElem = document.createElement(`div`);
      colorElem.className = `color`;
      colorElem.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;

      const valueElem = document.createElement(`div`);
      valueElem.className = `value`;
      valueElem.innerHTML = `${valueFormat(parseToNumber(value))}${
        unit ? `${unit === `%` && locale === `en` ? `` : `&nbsp;`}${unit}` : ``
      }`;

      const labelElem = document.createElement(`div`);
      labelElem.className = `label`;
      labelElem.innerHTML = label;

      lineElem.appendChild(colorElem);
      lineElem.appendChild(labelElem);
      lineElem.appendChild(valueElem);
      footer.appendChild(lineElem);
    });

  element.insertAdjacentElement(`beforeend`, footer);
  return true;
}

export function draw (
  element: HTMLElement,
  state: Config
): (conf: Config) => void {
  if (isChart(state.chartType)) {
    state.height = isDoughnutChart(state.chartType)
      ? state.width
      : state.height;
    const root = select(element).attr(
      `class`,
      `renderer ${state.chartType}-chart ${state.orientation}`
    );

    const chart = prepareChart(root, state);
    renderChart(state, chart);
    renderHeader(state, element);
    renderChartFooter(state, element);

    return (newState: Config) => {
      chart.select<SVGGElement>(`.axis--y`).call(createYAxis(newState));
      chart.select<SVGGElement>(`.axis--x`).call(createXAxis(newState));
      renderChart(newState, chart);
      element.querySelector('header')?.remove();
      renderHeader(newState, element);
      element.querySelector('footer')?.remove();
      renderChartFooter(newState, element);
    };
  } else if (isTable(state.chartType)) {
    // table render
    element.classList.add(`table`);
    const table = document.createElement(`table`);
    table.className = `table`;
    const tableWrapper = document.createElement(`div`);
    tableWrapper.className = `table-wrapper`;

    renderHeader(state, element);
    updateTable(table, state);

    tableWrapper.appendChild(table);
    element.appendChild(tableWrapper);

    const step = 0.75 * window.innerWidth;
    const tableTitle = renderTableTitle(state.tableTitle, tableWrapper, step);
    element.insertBefore(tableTitle, tableWrapper);

    // set cell max height for rows
    const tableRows = [...table.querySelectorAll(`tr`)];
    tableRows.forEach((row) => {
      const heights = [...row.children].map(
        (cell) => cell.getBoundingClientRect().height
      );
      row.style.setProperty(`--cellHeight`, `${Math.max(...heights)}px`);
    });

    return (newState: Config) => {
      updateTable(table, newState);
    };
  }
  return () => {};
}
