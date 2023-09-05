import {
  colors as colorSettings,
  fontAspectRatio,
  fontFamilyPrimary,
  fontSize,
  labelOffset,
} from './settings';
import { Selection } from 'd3';
import { ChartLabels } from './types';

export function createLabels(
  chart: Selection<SVGGElement, any, any, any>,
  labels: ChartLabels,
  width: number,
  height: number,
  maxValueLength: number
) {
  const verticalLabel = chart
    .selectAll<SVGTextElement, number>(`.verticalLabel`)
    .data([1]);
  const verticalMove = -1 * (maxValueLength + 1) * fontSize * fontAspectRatio;
  const verticalLabelEnter = verticalLabel
    .enter()
    .append(`text`)
    .attr(`class`, `verticalLabel`)
    .attr(`x`, verticalMove)
    .attr(`transform`, `rotate(-90, ${verticalMove}, ${height})`)
    .attr(`y`, height)
    .attr(`font-family`, fontFamilyPrimary)
    .attr(`fill`, colorSettings.label)
    .attr(`fill-opacity`, 0);
  verticalLabelEnter
    .merge(verticalLabel)
    .text(labels.verticalLabel)
    .transition()
    .duration(1000)
    .attr(`fill-opacity`, 1);

  const topLeftLabel = chart.selectAll(`.topLeftLabel`).data([1]);
  topLeftLabel
    .enter()
    .append(`text`)
    .attr(`class`, `topLeftLabel`)
    .attr(`x`, 0)
    .attr(`y`, 0)
    .attr(`font-family`, fontFamilyPrimary)
    .attr(`fill`, colorSettings.label);

  const topRightLabel = chart.selectAll(`.topRightLabel`).data([1]);
  topRightLabel
    .enter()
    .append(`text`)
    .attr(`class`, `topRightLabel`)
    .attr(`x`, width - 20)
    .attr(`y`, 0)
    .attr(`font-family`, fontFamilyPrimary)
    .attr(`fill`, colorSettings.label)
    .attr(`fill-opacity`, 1)
    .attr(`text-anchor`, `end`);

  const bottomRightLabel = chart
    .selectAll<SVGTextElement, number>(`.bottomRightLabel`)
    .data([1]);
  const bottomRightLabelEnter = bottomRightLabel
    .enter()
    .append(`text`)
    .attr(`class`, `bottomRightLabel`)
    .attr(`x`, width - 20)
    .attr(`y`, height + labelOffset * 1.75)
    .attr(`font-family`, fontFamilyPrimary)
    .attr(`fill`, colorSettings.label)
    .attr(`text-anchor`, `end`);
  bottomRightLabelEnter
    .merge(bottomRightLabel)
    .text(labels.horizontalLabel)
    .transition()
    .duration(1000)
    .attr(`fill-opacity`, 0.5);
}
