import {
  area as areaChart,
  curveLinear,
  format,
  interpolateArray,
  line as lineChart,
  transition,
} from 'd3';
import {
  colors as colorSettings,
  fontFamilyPrimary,
  symbolIndentRatio,
  symbolPointRatio,
  symbolRatio,
  symbolTextRatio,
} from '../settings';
import { getMaxLength, parseToNumber, rgbaToRgb } from '../utils';
import { Command, makeAbsolute, parseSVG } from 'svg-path-parser';
import { Chart, Config, Scales, ValueDatum } from '../types';
import { createLabels } from '../labels';

const barSymbol = `M9.2 5.3H6.6C6.5 5.1 6.5 4.9 6.4 4.8L3.8 0.3C3.5 -0.1 3.2 -0.1 3 0.3L0.4 4.8C0.2 5.2 0 5.8 0 6.2V11.4C0 11.8 0.3 12.2 0.8 12.2H3.4C3.5 12.4 3.5 12.6 3.6 12.7L6.2 17.2C6.4 17.6 6.7 17.6 7 17.2L9.6 12.7C9.8 12.3 10 11.7 10 11.3V6.1C10 5.7 9.7 5.3 9.2 5.3`;
const barSymbolCommands = makeAbsolute(parseSVG(barSymbol));

export function modifySVGCommands(
  commands: Command[],
  xModificator: (x: number) => number,
  yModificator: (y: number) => number
): string[] {
  return commands
    .map((i) => {
      switch (i.code) {
        case `M`: {
          return `M${xModificator(i.x)} ${yModificator(i.y)}`;
        }
        case `C`: {
          return `C${xModificator(i.x1)} ${yModificator(i.y1)} ${xModificator(
            i.x2
          )} ${yModificator(i.y2)} ${xModificator(i.x)} ${yModificator(i.y)}`;
        }
        case `L`: {
          return `L${xModificator(i.x)} ${yModificator(i.y)}`;
        }
        case `V`: {
          return `V${yModificator(i.y)}`;
        }
        case `H`: {
          return `H${xModificator(i.x)}`;
        }
        default: {
          return ``;
        }
      }
    })
    .filter((i) => i);
}

export function createBarSymbol(
  x: number,
  y: number,
  barWidth: number
): string {
  const modifyX = (pointX: number) => (pointX * barWidth) / 10 + x;
  const modifyY = (pointY: number) =>
    (pointY * barWidth) / 10 + y - barWidth * symbolRatio;
  return modifySVGCommands(barSymbolCommands, modifyX, modifyY).join(``);
}

export function createBarPath(
  x: number,
  y: number,
  barWidth: number,
  chartHeight: number
): string {
  return [
    `M${x} ${y - (barWidth * symbolRatio) / 2}`,
    `L${x} ${chartHeight}`,
    `L${x + barWidth} ${chartHeight}`,
    `L${x + barWidth} ${y - (barWidth * symbolRatio) / 2}`,
    `Z`,
  ].join(` `);
}

export function getSymbolCenter(width: number): number {
  return (width * symbolRatio) / 2;
}

export function createTextObject([, val]: ValueDatum) {
  const number = parseToNumber(val);
  const [, value, unit] =
    /([^a-zA-Z]*)([a-zA-Z]?)/g.exec(format(`~s`)(number)) || [];
  const sign = number < 0 ? `-` : `+`;
  return { value, unit, sign };
}

export function redrawBarChart(
  chart: Chart,
  set: ValueDatum[],
  { x: xScale, y: yScale }: Scales,
  { colors, cols, verticalLabel, horizontalLabel, width, height, unit }: Config
) {
  const t = transition().duration(1000);
  const delay = (_x: ValueDatum, index: number) => 500 + index * 100;

  createLabels(
    chart,
    {
      horizontalLabel,
      verticalLabel,
    },
    width,
    height,
    getMaxLength(set.map(([, val]) => ({ values: [val] })))
  );

  /* area */
  const areaGenerator = areaChart<ValueDatum>()
    .curve(curveLinear)
    .x(([key]) => (xScale(key) || 0) + (xScale.bandwidth() / 3) * 2)
    .y1(([, value]) => yScale(parseToNumber(value)))
    .y0(() => height);

  const area = chart.selectAll<SVGPathElement, number>(`.area`).data([1]);
  area.exit().remove();
  const areaEnter = area
    .enter()
    .append(`path`)
    .attr(`class`, `area`)
    .attr(`fill`, colorSettings.area)
    .attr(`opacity`, 0.5);
  areaEnter
    .merge(area)
    .transition(t)
    .delay(2000)
    .attrTween(`d`, () => {
      const interpolator = interpolateArray(
        set.map(() => 0),
        set.map(([, val]) => val)
      );
      return (trans) =>
        areaGenerator(
          interpolator(trans).map((value, index) => [set[index][0], value])
        ) || '';
    });

  /* bars */
  const bars = chart
    .selectAll<SVGGElement, ValueDatum>(`.bar`)
    .data(set, ([key]) => key);

  bars.exit().remove(); // exit
  const barsEnter = bars
    .enter()
    .append(`g`)
    .attr(`font-family`, fontFamilyPrimary)
    .attr(`class`, `bar`); // enter
  bars.merge(barsEnter); // update

  // bar color & fade
  const getBarPath = ([key, value]: ValueDatum, init = false) =>
    createBarPath(
      xScale(key) || 0,
      init ? height : yScale(parseToNumber(value)),
      xScale.bandwidth(),
      height
    );
  const getBarFill = ([key]: ValueDatum) => {
    const colorKey = cols[key].colors;
    const { end } = colors[colorKey];
    const { r, g, b } = rgbaToRgb(end); // bar has to be rgb because of graphic editors
    return `rgb(${r}, ${g}, ${b})`;
  };

  barsEnter
    .append(`path`)
    .attr(`class`, `bar__color`)
    .attr(`fill`, getBarFill)
    .attr(`d`, (pair) => getBarPath(pair, true))
    .transition(t)
    .delay(delay)
    .attr(`d`, (datum) => getBarPath(datum));

  barsEnter.merge(
    bars
      .select<SVGGElement>(`.bar__color`)
      .attr(`fill`, getBarFill)
      .transition(t)
      .attr(`d`, (pair) => getBarPath(pair))
  );

  /* line */
  const lineGenerator = lineChart<ValueDatum>()
    .curve(curveLinear)
    .x(([key]) => (xScale(key) || 0) + (xScale.bandwidth() / 3) * 2)
    .y(([, value]) => yScale(parseToNumber(value)));

  const line = chart.selectAll<SVGPathElement, ValueDatum>(`.line`).data([1]);
  line.exit().remove();
  const lineEnter = line
    .enter()
    .append(`path`)
    .attr(`class`, `line`)
    .attr(`fill`, `none`)
    .attr(`stroke`, colorSettings.line)
    .attr(`stroke-linejoin`, `round`)
    .attr(`stroke-linecap`, `round`)
    .attr(`stroke-width`, 2);
  lineEnter
    .merge(line)
    .transition(t)
    .delay(2000)
    .attrTween(`d`, () => {
      const interpolator = interpolateArray(
        set.map(() => 0),
        set.map(([, val]) => val)
      );
      return (trans) =>
        lineGenerator(
          interpolator(trans).map((value, index) => {
            return [set[index][0], value];
          })
        ) || '';
    });

  // symbol
  const getSymbolPath = ([key, value]: ValueDatum, init = false) =>
    createBarSymbol(
      xScale(key) || 0,
      init ? height : yScale(parseToNumber(value)),
      xScale.bandwidth()
    );
  const getSymbolFill = ([key]: ValueDatum, opacity = false) => {
    const colorKey = cols[key].colors;
    const {
      border: { r, g, b, a },
    } = colors[colorKey];
    return opacity ? a : `rgb(${r}, ${g}, ${b})`;
  };
  barsEnter
    .append(`path`)
    .attr(`class`, `bar__symbol`)
    .attr(`fill`, (pair) => getSymbolFill(pair))
    .attr(`fill-opacity`, (pair) => getSymbolFill(pair, true))
    .attr(`d`, (d) => getSymbolPath(d, true))
    .transition(t)
    .delay(delay)
    .attr(`d`, (datum) => getSymbolPath(datum))
    .attr(`fill`, (datum) => getSymbolFill(datum));
  barsEnter.merge(
    bars
      .select<SVGGElement>(`.bar__symbol`)
      .transition(t)
      .attr(`d`, (d) => getSymbolPath(d))
      .attr(`fill`, (d) => getSymbolFill(d))
  );

  // text
  const getTextX = ([key]: ValueDatum) =>
    (xScale(key) || 0) + xScale.bandwidth() / 2;
  const getTextFontSize = () => xScale.bandwidth() * symbolTextRatio;
  const getTextLetterSpacing = () => (getTextFontSize() * -1) / 20;
  const getTextY = ([, value]: ValueDatum) =>
    (value ? yScale(parseToNumber(value)) : height) -
    getSymbolCenter(xScale.bandwidth()) +
    (getTextFontSize() / 5) * 2;

  barsEnter
    .append(`text`)
    .attr(`class`, `bar__text`)
    .attr(`fill`, `white`)
    .attr(`text-anchor`, `middle`)
    .attr(`font-weight`, `bold`)
    .text((current) => createTextObject(current).value)
    .attr(`font-size`, getTextFontSize)
    .attr(`letter-spacing`, getTextLetterSpacing)
    .attr(`font-family`, fontFamilyPrimary)
    .attr(`x`, getTextX)
    .attr(`y`, () => getTextY(['', '']))
    .transition(t)
    .delay(delay)
    .attr(`y`, getTextY);
  barsEnter.merge(
    bars
      .select<SVGGElement>(`.bar__text`)
      .text((current) => createTextObject(current).value)
      .transition(t)
      .attr(`font-size`, getTextFontSize)
      .attr(`x`, getTextX)
      .attr(`y`, getTextY)
  );

  // unit
  const getUnitFontSize = () => xScale.bandwidth() / 4;
  const getUnitX = ([key]: ValueDatum) =>
    (xScale(key) || 0) + (xScale.bandwidth() / 3) * 2;
  const getUnitY = ([, value]: ValueDatum, init = false) =>
    (init ? height : yScale(parseToNumber(value))) -
    xScale.bandwidth() * symbolIndentRatio +
    (getUnitFontSize() / 5) * 3;

  barsEnter
    .append(`text`)
    .attr(`class`, `bar__units`)
    .attr(`fill`, `white`)
    .attr(`text-anchor`, `middle`)
    .attr(`font-weight`, `bold`)
    .text((current) => unit || createTextObject(current).unit)
    .attr(`font-size`, getUnitFontSize)
    .attr(`x`, getUnitX)
    .attr(`y`, (pair) => getUnitY(pair, true))
    .transition(t)
    .delay(delay)
    .attr(`y`, (datum) => getUnitY(datum))
    .attr(`font-size`, getUnitFontSize);
  barsEnter.merge(
    bars
      .select<SVGGElement>(`.bar__units`)
      .text((current) => unit || createTextObject(current).unit)
      .transition(t)
      .attr(`x`, getUnitX)
      .attr(`y`, (pair) => getUnitY(pair))
      .attr(`font-size`, getUnitFontSize)
  );

  /* points */
  const getPointRadius = () => xScale.bandwidth() * symbolPointRatio;
  const getPointX = ([key]: ValueDatum) =>
    (xScale(key) || 0) + (xScale.bandwidth() * 2) / 3 - getPointRadius() / 2;

  const points = chart
    .selectAll<SVGCircleElement, ValueDatum>(`.point`)
    .data(set, ([key]) => key);

  points.exit().remove();

  const pointsEnter = points
    .enter()
    .append(`circle`)
    .attr(`class`, `point`)
    .attr(`stroke-width`, 2)
    .attr(`stroke`, colorSettings.line)
    .attr(`fill`, colorSettings.point);

  pointsEnter
    .merge(points)
    .transition(t)
    .attr(`cx`, getPointX)
    .attr(`r`, () => getPointRadius())
    .attr(`cy`, ([, value]) => yScale(parseToNumber(value)));
}
