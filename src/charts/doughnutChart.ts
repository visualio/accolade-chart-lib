import { transition, pie, arc, interpolate, PieArcDatum } from 'd3';
import { parseToNumber, sortData } from '../utils';
import { Chart, Config, ValueDatum } from '../types';

export function redrawDoughnutChart(
  chart: Chart,
  set: ValueDatum[],
  { colors, cols, width, sortDirection, sortType }: Config
) {
  const t = transition().duration(1000).delay(1000);
  const sortedData = set.sort(sortData(sortType, sortDirection, cols));
  const pieFactory = pie<ValueDatum>().value(([, value]: ValueDatum) =>
    parseToNumber(value)
  );
  const data = pieFactory(sortedData);

  const radius = width / 2;
  const innerRadius = radius * 0.55;

  const pieGen = arc<any, PieArcDatum<ValueDatum>>()
    .innerRadius(innerRadius)
    .outerRadius(radius);

  const arcTween = (newData: PieArcDatum<ValueDatum>, idx: number) => {
    const initData: PieArcDatum<ValueDatum> = {
      ...newData,
      data: [newData.data[0], 0],
      endAngle: 0,
      padAngle: 0,
      startAngle: 0,
      value: 0,
    };
    const interpolator = interpolate(initData, newData);
    return function (tr: number): string {
      const newArcDatum = interpolator(tr);
      return pieGen(newArcDatum, idx) || '';
    };
  };

  // wrapper
  const doughnut = chart
    .selectAll(`.doughnut`)
    .data([1])
    .enter()
    .append(`g`)
    .attr(`class`, `doughnut`)
    .attr(`transform`, `translate(${width / 2}, ${width / 2})`);

  // arcs
  const arcs = chart
    .select(`.doughnut`)
    .selectAll<SVGPathElement, PieArcDatum<string>>(`.arc`)
    .data(data, ({ data: [key] }) => key);
  arcs.exit().remove();
  const arcsEnter = arcs.enter().append(`path`).attr(`class`, `arc`);

  arcsEnter
    .merge(arcs)
    .transition(t)
    .attrTween(`d`, arcTween)
    .attr(`fill`, (_d, idx) => {
      const [key] = set[idx];
      const { colors: colorKey } = cols[key];
      const {
        border: { r, g, b },
      } = colors[colorKey];
      return `rgb(${r}, ${g}, ${b})`;
    });

  // center
  const center = doughnut
    .selectAll<SVGCircleElement, number>(`.center`)
    .data([1]);
  const centerEnter = center
    .enter()
    .append(`circle`)
    .attr(`class`, `center`)
    .attr(`stroke`, `white`)
    .attr(`stroke-width`, 60)
    .attr(`stroke-opacity`, 0.8)
    .attr(`cx`, 0)
    .attr(`cy`, 0)
    .attr(`fill`, `none`)
    .attr(`r`, 0);

  centerEnter.merge(center).transition().duration(500).attr(`r`, innerRadius);
}
