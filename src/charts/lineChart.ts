import {
  transition,
  line as lineChart,
  area as areaChart,
  interpolateArray,
  curveMonotoneX,
  select,
  ScaleBand,
} from 'd3';
import { colors as colorSettings, symbolPointRatio } from '../settings';
import {
  findLongestConsecutive,
  getLastItemFromObject,
  getMaxLength,
  getRGBAOpacity,
  isNumeric,
  parseToNumber,
  rgbaToString,
  uniqueString,
} from '../utils';
import { computePosition, shift, flip, offset, arrow } from '@floating-ui/dom';
import { createLabels } from '../labels';
import { createValueFormatter, setFormatLocale } from '../format';
import {
  Annotation,
  AnnotationData,
  Chart,
  Col,
  ColorDatum,
  Colors,
  Config,
  Dimensions,
  RowDatum,
  RowValues,
  Scales,
} from '../types';
import { BaseType } from 'd3-selection';
import { Transition } from 'd3-transition';

const getStartColor = ([, { start }]: ColorDatum): string =>
  rgbaToString(start);
const getEndColor = ([, { end }]: ColorDatum): string => rgbaToString(end);
const getStartOpacity = ([, { start }]: ColorDatum): number =>
  getRGBAOpacity(start);
const getEndOpacity = ([, { end }]: ColorDatum): number => getRGBAOpacity(end);

function createDefs(
  chart: Chart,
  colorMap: Colors,
  t: Transition<BaseType, unknown, null, undefined>,
  set: RowDatum[],
  xScale: ScaleBand<string>,
  idPrefix: string
) {
  const colors: ColorDatum[] = set.map(([, { colors: colorId }]) => [
    colorId,
    colorMap[colorId],
  ]);
  const defs = chart.select(`defs`);

  // Gradients
  const gradients = defs
    .selectAll<SVGLinearGradientElement, ColorDatum>(`.gradient`)
    .data(colors, ([key]) => key);

  gradients.exit().remove();
  const gradientsEnter = gradients
    .enter()
    .append(`linearGradient`)
    .attr(`class`, `gradient`)
    .attr(`gradientTransform`, `rotate(${-15})`)
    .attr(`id`, ([key]) => `${idPrefix}-gradient-line-${key}`)
    .attr(`x1`, `0%`)
    .attr(`y1`, `0%`)
    .attr(`x2`, `0%`)
    .attr(`y2`, `100%`);
  gradients.merge(gradientsEnter);

  gradientsEnter
    .append(`stop`)
    .attr(`class`, `gradient__start`)
    .attr(`offset`, `20%`)
    .attr(`stop-color`, getStartColor)
    .attr(`stop-opacity`, getStartOpacity)
    .transition(t)
    .attr(`stop-color`, getStartColor)
    .attr(`stop-opacity`, getStartOpacity);
  gradientsEnter
    .merge(
      gradients
        .select<SVGLinearGradientElement>(`.gradient__start`)
        .transition(t)
        .attr(`stop-color`, getStartColor)
    )
    .attr(`stop-opacity`, getStartOpacity);

  gradientsEnter
    .append(`stop`)
    .attr(`class`, `gradient__end`)
    .attr(`offset`, `100%`)
    .attr(`stop-color`, getEndColor)
    .attr(`stop-opacity`, getEndOpacity)
    .transition(t)
    .attr(`stop-color`, getEndColor)
    .attr(`stop-opacity`, getEndOpacity);
  gradientsEnter
    .merge(
      gradients
        .select<SVGLinearGradientElement>(`.gradient__end`)
        .transition(t)
        .attr(`stop-color`, getEndColor)
    )
    .attr(`stop-opacity`, getEndOpacity);

  // Clips
  const clips = defs
    .selectAll<SVGClipPathElement, RowDatum>(`.clip`)
    .data(set, ([key]) => key);
  clips.exit().remove();
  const clipsEnter = clips
    .enter()
    .append(`clipPath`)
    .attr(`class`, `clip`)
    .attr(`id`, ([key]) => `${idPrefix}-clip${key}`);
  clips.merge(clipsEnter);

  const getClipWidth = ([, { values }]: RowDatum) =>
    getClipDimensions(values, xScale).width;
  const getClipX = ([, { values }]: RowDatum) =>
    getClipDimensions(values, xScale).x;

  clipsEnter
    .append(`rect`)
    .attr(`class`, `clip__shape`)
    .attr(`width`, getClipWidth)
    .attr(`x`, getClipX)
    .attr(`height`, 5000)
    .attr(`y`, 0)
    .transition(t)
    .attr(`width`, getClipWidth)
    .attr(`x`, getClipX);
  clipsEnter.merge(
    clips
      .select<SVGClipPathElement>(`.clip__shape`)
      .transition(t)
      .attr(`width`, getClipWidth)
      .attr(`x`, getClipX)
  );
}

function getClipDimensions(
  values: RowValues,
  xScale: ScaleBand<string>
): Dimensions {
  let i = 0;
  const obj: Record<number, string> = {};
  for (const key in values) {
    i += 1;
    const value = values[key];
    if (isNumeric(value)) obj[i] = key;
  }

  const set = findLongestConsecutive(Object.keys(obj).map(parseFloat));
  const [first, last] = [set[0], set[set.length - 1]];
  const firstX = xScale(obj[first]) || 0;
  const lastX = xScale(obj[last]) || 0;

  return set.length
    ? {
        x: firstX + xScale.bandwidth() / 2,
        width: lastX - firstX,
      }
    : {
        x: 0,
        width: 0,
      };
}

export function redrawLineChart(
  chart: Chart,
  set: RowDatum[],
  { x: xScale, y: yScale }: Scales,
  {
    colors,
    verticalLabel,
    horizontalLabel,
    height,
    width,
    locale,
    cols,
    decimalPlaces,
  }: Config
) {
  const valueFormatter = createValueFormatter(decimalPlaces);
  setFormatLocale(locale);
  const idPrefix = uniqueString();
  const masterRow = set[0][1];
  const isMasterRow = (key: string) => key === `1`;
  const minValue = Math.min(
    ...set
      .reduce(
        (acc: Array<string | number>, [, { values }]) =>
          acc.concat(Object.values(values)),
        []
      )
      .filter((i): i is number => isNumeric(i))
  );
  const t = transition().duration(1000);
  createDefs(chart, colors, t, set, xScale, idPrefix);
  createLabels(
    chart,
    {
      horizontalLabel,
      verticalLabel,
    },
    width,
    height,
    getMaxLength(set.map(([, obj]) => ({ values: Object.values(obj.values) })))
  );

  /* top labels */
  const topLabels = chart
    .select(`.topLeftLabel`)
    .selectAll<SVGTSpanElement, RowDatum>(`.topLabels`)
    .data(set, ([key]) => key);
  topLabels.exit().remove();
  const topLabelsEnter = topLabels
    .enter()
    .append(`tspan`)
    .attr(`class`, `topLabels`);
  topLabelsEnter
    .merge(topLabels)
    .html(([, { values, name, colors: key }]) => {
      const {
        border: { r, g, b },
      } = colors[key];
      const color = `rgb(${r}, ${g}, ${b})`;
      const lastItem = getLastItemFromObject(values);
      return name
        ? `
                    <tspan y="10" fill="${color}" stroke="${color}" stroke-width="10" font-size="30">•</tspan>
                    <tspan y="5" dx="10" font-size="12">${name}</tspan>
                    <tspan dx="5" font-weight="bold" font-size="12">
                        ${
                          typeof lastItem === 'number'
                            ? valueFormatter(lastItem)
                            : lastItem
                        }
                    </tspan>
            `
        : ``;
    })
    .attr(`dx`, (_ignore, idx) => (idx > 0 ? 20 : -50));

  /* areas */
  const masterArea = areaChart<[string, number]>()
    .curve(curveMonotoneX)
    .x(([key]) => (xScale(key) || 0) + xScale.bandwidth() / 2)
    .y0(() => yScale(minValue))
    .y1(([, value]) => yScale(value));

  const slaveArea = areaChart<[string, number]>()
    .curve(curveMonotoneX)
    .x(([key]) => (xScale(key) || 0) + xScale.bandwidth() / 2)
    .y0(([key]) => yScale(parseToNumber(masterRow.values[key])))
    .y1(([key, value]) =>
      value ? yScale(value) : yScale(parseToNumber(masterRow.values[key]))
    );

  const areas = chart
    .selectAll<SVGPathElement, RowDatum>(`.area`)
    .data(set, ([key]) => key);

  areas.exit().remove();

  const areasEnter = areas
    .enter()
    .append(`path`)
    .attr(`class`, `area`)
    .attr(`fill-opacity`, 0);

  areasEnter
    .merge(areas)
    .attr(
      `fill`,
      ([, { colors: colorKey }]) =>
        `url(#${idPrefix}-gradient-line-${colorKey})`
    )
    .attr(
      `clip-path`,
      ([key]) => !isMasterRow(key) && `url(#${idPrefix}-clip${key})`
    )
    .transition(t)
    .attrTween(`d`, ([key, { values: map }]: RowDatum) => {
      const values = Object.entries(map);
      const interpolator = interpolateArray(
        values.map(() => 0),
        values.map(([, val]) => parseToNumber(val))
      );
      return (tr): string => {
        const area = isMasterRow(key) ? masterArea : slaveArea;
        return (
          area(interpolator(tr).map((value, idx) => [values[idx][0], value])) ||
          ''
        );
      };
    })
    .transition()
    .attr(`fill-opacity`, 1);

  /*lines*/
  const masterLine = lineChart<[string, number]>()
    .curve(curveMonotoneX)
    .x(([key]) => (xScale(key) || 0) + xScale.bandwidth() / 2)
    .y(([, value]) => yScale(value));

  const slaveLine = lineChart<[string, number]>()
    .curve(curveMonotoneX)
    .x(([key]) => (xScale(key) || 0) + xScale.bandwidth() / 2)
    .y(([key, value]) =>
      value ? yScale(value) : yScale(parseToNumber(masterRow.values[key]))
    );

  const lines = chart.selectAll<SVGPathElement, RowDatum>(`.line`).data(
    set.sort(([key]) => (isMasterRow(key) ? 1 : -1)),
    ([key]) => key
  );

  lines.exit().remove();

  const linesEnter = lines
    .enter()
    .append(`path`)
    .attr(`class`, `line`)
    .attr(`fill`, `none`)
    .attr(`stroke-linejoin`, `round`)
    .attr(`stroke-linecap`, `round`)
    .attr(`stroke-width`, 2);

  linesEnter
    .merge(lines)
    .attr(`clip-path`, ([key]) => !isMasterRow(key) && `url(#clip${key})`)
    .transition(t)
    .attr(`stroke`, ([, { colors: colorKey }]) => {
      const {
        border: { r, g, b },
      } = colors[colorKey];
      return `rgb(${r}, ${g}, ${b})`;
    })
    .attrTween(`d`, ([key, { values: map }]) => {
      const values = Object.entries(map);
      const interpolator = interpolateArray(
        values.map(() => minValue),
        values.map(([, val]) => parseToNumber(val))
      );
      return (tr): string => {
        const line = isMasterRow(key) ? masterLine : slaveLine;
        return (
          line(interpolator(tr).map((value, idx) => [values[idx][0], value])) ||
          ''
        );
      };
    });

  /* point helpers */
  const getPointRadius = () => xScale.bandwidth() * symbolPointRatio;
  const getPointX = (colKey: string): number => {
    return (
      (xScale(colKey) || 0) + xScale.bandwidth() / 2 - getPointRadius() / 2 + 4
    );
  };

  /* annotations */
  const tooltip = select('body')
    .append('div')
    .attr('class', 'tooltip')
    .style('position', 'absolute')
    .style('left', '0')
    .style('top', '0')
    .style('opacity', '0')
    .style('pointer-events', 'none')
    .style('z-index', '500');

  const annotationData = Object.entries(cols)
    .filter(([, { annotation }]) => annotation)
    .map(
      ([key, { annotation, annotationWidth = 2 }]: [
        string,
        Col,
      ]): AnnotationData => [
        key,
        annotation as Annotation,
        Math.max(
          ...set
            .map(([, { values }]) => parseToNumber(values[key]))
            .filter((i) => i)
        ),
        annotationWidth,
      ]
    );

  const annotations = chart
    .selectAll<SVGLineElement, AnnotationData>(`.annotation`)
    .data(annotationData);
  annotations.exit().remove();

  const annotationsEnter = annotations
    .enter()
    .append(`line`)
    .attr(`class`, `annotation`);

  annotationsEnter
    .merge(annotations)
    .transition(t)
    .attr(`x1`, ([colKey]) => getPointX(colKey))
    .attr(`y1`, height)
    .attr(`x2`, ([colKey]) => getPointX(colKey))
    .attr(`y2`, ([, , value]) => yScale(value) + getPointRadius())
    .attr(`stroke`, colorSettings.label)
    .attr(`stroke-width`, ([, , , annotationWidth]) => annotationWidth);

  /* points */
  const pointsData = set
    .sort(([key]) => (isMasterRow(key) ? 1 : -1))
    .reduce((acc: Array<[string, string, number]>, [rowKey, { values }]) => {
      return acc.concat(
        Object.entries(values).map(([key, value]) => [
          rowKey,
          key,
          parseToNumber(value),
        ])
      );
    }, [])
    .filter(([, , value]) => value);

  const points = chart
    .selectAll<SVGCircleElement, [string, string, number]>(`.point`)
    .data(pointsData, ([rowKey, colKey]) => rowKey + colKey);

  points.exit().remove();

  const pointsEnter = points
    .enter()
    .append(`circle`)
    .attr(`class`, `point`)
    .attr(`stroke-width`, 2)
    .attr(`fill`, colorSettings.point);

  pointsEnter
    .merge(points)
    .transition(t)
    .attr(`r`, () => getPointRadius())
    .attr(`cx`, ([, key]) => getPointX(key))
    .attr(`cy`, ([, , value]) => yScale(value))
    .attr(`stroke`, ([rowKey]) => {
      const [, row] = set.find(([key]) => key === rowKey) || [];
      if (row) {
        const {
          border: { r, g, b },
        } = colors[row.colors];
        return `rgb(${r}, ${g}, ${b})`;
      }
      return '';
    });

  /* annotation trigger */
  chart
    .selectAll(`.annotation-area`)
    .data(annotationData)
    .enter()
    .append(`rect`)
    .attr(`class`, `annotation-area`)
    .attr(`fill`, 'transparent')
    .attr(`x`, ([key]) => (xScale(key) || 0) + xScale.bandwidth() / 2 - 14)
    .attr(`y`, ([, , value]) => yScale(value) - 14)
    .attr(`width`, 28)
    .attr(`height`, ([, , value]) => height - yScale(value) + 50)
    .on('mouseover', (_x, [key, [head, ...rest]]) =>
      tooltip.style('opacity', '1').html(`
                    <table>
                        <caption>${cols[key].value}</caption>
                        <thead>
                            <tr>
                                ${head.map((it) => `<th>${it}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${rest
                              .map(
                                (row) => `
                                <tr>${row
                                  .map(
                                    (it) => `<td data-value="${it}">${it}</td>`
                                  )
                                  .join('')}</tr>
                            `
                              )
                              .join('')}
                        </tbody>
                    </table>
                    <div class="tooltip-arrow"></div>
                `)
    )
    .on('mousemove', ({ clientX, clientY }) => {
      const virtualEl = {
        getBoundingClientRect() {
          return {
            width: 0,
            height: 0,
            x: clientX,
            y: clientY,
            left: clientX,
            right: clientX,
            top: clientY,
            bottom: clientY,
          };
        },
      };
      const floatingElement = tooltip.node() as HTMLDivElement;
      const arrowElement = floatingElement.lastElementChild as HTMLDivElement;
      computePosition(virtualEl, floatingElement, {
        placement: 'top',
        middleware: [
          offset(20),
          flip(),
          shift(),
          arrow({ element: arrowElement }),
        ],
      }).then(({ x, y, middlewareData: { arrow }, placement }) => {
        Object.assign(floatingElement.style, {
          top: placement === 'top' ? `${y}px` : 0,
          transform: placement === 'bottom' ? `translateY(100%)` : `none`,
          left: `${x}px`,
        });
        Object.assign(arrowElement.style, {
          top: placement === 'top' ? `100%` : 0,
          transform:
            placement === 'bottom'
              ? `translateY(-100%) rotate(180deg)`
              : `none`,
          left: `${arrow?.x || 0}px`,
        });
      });
    })
    .on('mouseout', () => tooltip.style('opacity', '0'));
}
