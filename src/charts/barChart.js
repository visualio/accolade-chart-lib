import {
    transition,
    line as lineChart,
    area as areaChart,
    interpolateArray,
    curveLinear,
} from 'd3'
import {createBarPath, createBarSymbol, createLabels, createTextObject, getSymbolCenter} from "../chart"
import {
    colors as colorSettings, fontFamilyPrimary, symbolIndentRatio, symbolPointRatio,
    symbolTextRatio,
} from "../settings"
import {getMaxLength, rgbaToRgb} from "../utils"

export function redrawBarChart({chart, set, xScale, yScale, colors, cols, labels, width, height, unit}) {
    const t = transition().duration(1000)
    const delay = (x, i) => 500 + i * 100

    createLabels(chart, labels, width, height, getMaxLength(set.map(([, val]) => ({values: [val]}))))

    /* area */
    const areaGenerator = areaChart()
        .curve(curveLinear)
        .x(([key]) => xScale(key) + xScale.bandwidth() / 3 * 2)
        .y1(([, value]) => yScale(value))
        .y0(() => height)

    const area = chart.selectAll(`.area`).data([1])
    area.exit().remove()
    const areaEnter = area.enter().append(`path`)
        .attr(`class`, `area`)
        .attr(`fill`, colorSettings.area)
        .attr(`opacity`, 0.5)
    areaEnter.merge(area)
        .transition(t).delay(2000)
        .attrTween(`d`, () => {
            const interpolator = interpolateArray(set.map(() => 0), set.map(([, val]) => val))
            return trans => areaGenerator(interpolator(trans).map((value, index) => ([set[index][0], value])))
        })

    /* bars */
    const bars = chart.selectAll(`.bar`).data(set, ([key]) => key) // selection
    bars.exit().remove() // exit
    const barsEnter = bars.enter().append(`g`)
        .attr(`font-family`, fontFamilyPrimary)
        .attr(`class`, `bar`)// enter
    bars.merge(barsEnter) // update

    // bar color & fade
    const getBarPath = ([key, value], init) => createBarPath(xScale(key), init === `init` ? height : yScale(value), xScale.bandwidth(), height)
    const getBarFill = ([key]) => {
        const colorKey = cols[key].colors
        const {end} = colors[colorKey]
        const {r, g, b} = rgbaToRgb(end) // bar has to be rgb because of graphic editors
        return `rgb(${r}, ${g}, ${b})`
    }

    barsEnter
        .append(`path`)
        .attr(`class`, `bar__color`)
        .attr(`fill`, getBarFill)
        .attr(`d`, pair => getBarPath(pair, `init`))
        .transition(t).delay(delay).attr(`d`, getBarPath)
    barsEnter.merge(
        bars.select(`.bar__color`)
            .attr(`fill`, getBarFill)
            .transition(t).attr(`d`, getBarPath)
    )

    /* line */
    const lineGenerator = lineChart()
        .curve(curveLinear)
        .x(([key]) => xScale(key) + xScale.bandwidth() / 3 * 2)
        .y(([, value]) => yScale(value))

    const line = chart.selectAll(`.line`).data([1])
    line.exit().remove()
    const lineEnter = line.enter().append(`path`)
        .attr(`class`, `line`)
        .attr(`fill`, `none`)
        .attr(`stroke`, colorSettings.line)
        .attr(`stroke-linejoin`, `round`)
        .attr(`stroke-linecap`, `round`)
        .attr(`stroke-width`, 2)
    lineEnter.merge(line)
        .transition(t).delay(2000)
        .attrTween(`d`, () => {
            const interpolator = interpolateArray(set.map(() => 0), set.map(([, val]) => val))
            return trans => lineGenerator(interpolator(trans).map((value, index) => {
                return ([set[index][0], value])
            }))
        })

    // symbol
    const getSymbolPath = ([key, value], init) => createBarSymbol(xScale(key), init === `init` ? height : yScale(value), xScale.bandwidth())
    const getSymbolFill = ([key], opacity = false) => {
        const colorKey = cols[key].colors
        const {border: {r, g, b, a}} = colors[colorKey]
        return opacity === true ? a : `rgb(${r}, ${g}, ${b})`
    }
    barsEnter
        .append(`path`)
        .attr(`class`, `bar__symbol`)
        .attr(`fill`, (pair) => getSymbolFill(pair))
        .attr(`fill-opacity`, (pair) => getSymbolFill(pair, true))
        .attr(`d`, d => getSymbolPath(d, `init`))
        .transition(t).delay(delay).attr(`d`, getSymbolPath).attr(`fill`, getSymbolFill)
    barsEnter.merge(
        bars.select(`.bar__symbol`)
            .transition(t).attr(`d`, getSymbolPath).attr(`fill`, getSymbolFill)
    )

    // text
    const getTextX = ([key]) => xScale(key) + xScale.bandwidth() / 2
    const getTextFontSize = () => xScale.bandwidth() * symbolTextRatio
    const getTextLetterSpacing = () => getTextFontSize() * -1 / 20
    const getTextY = ([, value]) => (value ? yScale(value) : height) - getSymbolCenter(xScale.bandwidth()) + getTextFontSize() / 5 * 2

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
        .attr(`y`, () => getTextY([]))
        .transition(t).delay(delay).attr(`y`, getTextY)
    barsEnter.merge(
        bars.select(`.bar__text`)
            .text((current) => createTextObject(current).value)
            .transition(t).attr(`font-size`, getTextFontSize).attr(`x`, getTextX).attr(`y`, getTextY)
    )

    // unit
    const getUnitFontSize = () => xScale.bandwidth() / 4
    const getUnitX = ([key]) => xScale(key) + xScale.bandwidth() / 3 * 2
    const getUnitY = ([, value], init) => (init === `init` ? height : yScale(value)) - (xScale.bandwidth() * symbolIndentRatio) + getUnitFontSize() / 5 * 3
    barsEnter
        .append(`text`)
        .attr(`class`, `bar__units`)
        .attr(`fill`, `white`)
        .attr(`text-anchor`, `middle`)
        .attr(`font-weight`, `bold`)
        .text((current) => unit || createTextObject(current).unit)
        .attr(`font-size`, getUnitFontSize)
        .attr(`x`, getUnitX)
        .attr(`y`, pair => getUnitY(pair, `init`))
        .transition(t).delay(delay).attr(`y`, getUnitY).attr(`font-size`, getUnitFontSize)
    barsEnter.merge(
        bars.select(`.bar__units`)
            .text((current) => unit || createTextObject(current).unit)
            .transition(t).attr(`x`, getUnitX).attr(`y`, getUnitY).attr(`font-size`, getUnitFontSize)
    )

    /* points */
    const getPointRadius = () => xScale.bandwidth() * symbolPointRatio
    const getPointX = ([key]) => xScale(key) + xScale.bandwidth() * 2 / 3 - getPointRadius() / 2

    const points = chart.selectAll(`.point`).data(set, ([key]) => key)

    points.exit().remove()

    const pointsEnter = points.enter().append(`circle`)
        .attr(`class`, `point`)
        .attr(`stroke-width`, 2)
        .attr(`stroke`, colorSettings.line)
        .attr(`fill`, colorSettings.point)

    pointsEnter.merge(points)
        .transition(t)
        .attr(`cx`, getPointX)
        .attr(`r`, () => getPointRadius())
        .attr(`cy`, ([, value]) => yScale(value))
}