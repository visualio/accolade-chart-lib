import {
    transition,
    line as lineChart,
    area as areaChart,
    interpolateArray,
    curveMonotoneX, format,
} from 'd3'
import {colors as colorSettings, symbolPointRatio} from "../settings"
import pairs from "lodash.pairs"
import {findLongestConsecutive, getLastItemFromObject, getMaxLength, isNumeric} from "../utils"
import {createLabels, setFormatLocale} from "../chart"

function createDefs({chart, colors: colorMap, t, set, xScale}) {

    const colors = set.map(([, {colors: colorId}]) => [colorId, colorMap[colorId]])
    const defs = chart.select(`defs`)

    // Gradients
    const gradients = defs.selectAll(`.gradient`).data(colors, ([key]) => key)
    gradients.exit().remove()
    const gradientsEnter = gradients.enter()
        .append(`linearGradient`)
        .attr(`class`, `gradient`)
        .attr(`gradientTransform`, `rotate(${-15})`)
        .attr(`id`, ([key]) => `gradient-line-${key}`)
        .attr(`x1`, `0%`)
        .attr(`y1`, `0%`)
        .attr(`x2`, `0%`)
        .attr(`y2`, `100%`)
    gradients.merge(gradientsEnter)

    const getStartColor = ([, {start: {r, g, b}}]) => `rgb(${r}, ${g}, ${b})`
    const getEndColor = ([, {end: {r, g, b}}]) => `rgb(${r}, ${g}, ${b})`
    const getStartOpacity = ([, {start: {a}}]) => a
    const getEndOpacity = ([, {end: {a}}]) => a

    gradientsEnter
        .append(`stop`)
        .attr(`class`, `gradient__start`)
        .attr(`offset`, `20%`)
        .attr(`stop-color`, getStartColor)
        .attr(`stop-opacity`, getStartOpacity)
        .transition(t)
        .attr(`stop-color`, getStartColor)
        .attr(`stop-opacity`, getStartOpacity)
    gradientsEnter.merge(gradients.select(`.gradient__start`).transition(t).attr(`stop-color`, getStartColor)).attr(`stop-opacity`, getStartOpacity)

    gradientsEnter
        .append(`stop`)
        .attr(`class`, `gradient__end`)
        .attr(`offset`, `100%`)
        .attr(`stop-color`, getEndColor)
        .attr(`stop-opacity`, getEndOpacity)
        .transition(t)
        .attr(`stop-color`, getEndColor)
        .attr(`stop-opacity`, getEndOpacity)
    gradientsEnter.merge(gradients.select(`.gradient__end`).transition(t).attr(`stop-color`, getEndColor)).attr(`stop-opacity`, getEndOpacity)

    // Clips
    const clips = defs.selectAll(`.clip`).data(set, ([key]) => key)
    clips.exit().remove()
    const clipsEnter = clips.enter()
        .append(`clipPath`)
        .attr(`class`, `clip`)
        .attr(`id`, ([key]) => `clip${key}`)
    clips.merge(clipsEnter)

    const getClipWidth = ([, {values}]) => getClipDimensions(values, xScale).width
    const getClipX = ([, {values}]) => getClipDimensions(values, xScale).x

    clipsEnter
        .append(`rect`)
        .attr(`class`, `clip__shape`)
        .attr(`width`, getClipWidth)
        .attr(`x`, getClipX)
        .attr(`height`, 5000)
        .attr(`y`, 0)
        .transition(t)
        .attr(`width`, getClipWidth)
        .attr(`x`, getClipX)
    clipsEnter.merge(clips.select(`.clip__shape`).transition(t).attr(`width`, getClipWidth).attr(`x`, getClipX))
}

function getClipDimensions(values, xScale) {
    let i = 0
    const obj = {}
    for (const key in values) {
        i += 1
        const value = values[key]
        if (isNumeric(value))
            obj[i] = key
    }

    const set = findLongestConsecutive(Object.keys(obj).map(parseFloat))
    const [first, last] = [set[0], set[set.length - 1]]

    return set.length ? {
        x: xScale(obj[first]) + xScale.bandwidth() / 2,
        width: xScale(obj[last]) - xScale(obj[first]),
    } : {
        x: 0,
        width: 0,
    }
}

export function redrawLineChart({chart, set, xScale, yScale, colors, labels, height, width, locale}) {
    setFormatLocale(locale)
    const master = set[0][1] // TODO
    const isMaster = (key) => key === `1` // TODO
    const minValue = Math.min(...set.reduce((acc, [, {values}]) => acc.concat(Object.values(values)), []).filter(isNumeric))
    const t = transition().duration(1000)
    createDefs({chart, colors, t, set, xScale})
    createLabels(chart, labels, width, height, getMaxLength(set.map(([, obj]) => obj)))

    /* top labels */
    const topLabels = chart.select(`.topLeftLabel`)
        .selectAll(`.topLabels`)
        .data(set, ([key]) => key)
    topLabels.exit().remove()
    const topLabelsEnter = topLabels.enter().append(`tspan`)
        .attr(`class`, `topLabels`)

    topLabelsEnter.merge(topLabels)
        .html(([, {values, name, colors: key}]) => {
            const {border: {r, g, b}} = colors[key]
            const color = `rgb(${r}, ${g}, ${b})`
            return `
                    <tspan y="10" fill="${color}" stroke="${color}" stroke-width="10" font-size="30">•</tspan>
                    <tspan y="5" dx="10" font-size="12">${name}</tspan>
                    <tspan dx="5" font-weight="bold" font-size="12">${format(`,`)(getLastItemFromObject(values))}</tspan>
            `
        })
        .attr(`dx`, (ignore, idx) => idx > 0 ? 20 : -50)

    /* areas */
    const masterArea = areaChart()
        .curve(curveMonotoneX)
        .x(([key]) => xScale(key) + xScale.bandwidth() / 2)
        .y0(() => yScale(minValue))
        .y1(([, value]) => yScale(value))

    const slaveArea = areaChart()
        .curve(curveMonotoneX)
        .x(([key]) => xScale(key) + xScale.bandwidth() / 2)
        .y0(([key]) => yScale(master.values[key]))
        .y1(([key, value]) => value ? yScale(value) : yScale(master.values[key]))

    const areas = chart.selectAll(`.area`).data(set, ([key]) => key)

    areas.exit().remove()

    const areasEnter = areas.enter().append(`path`)
        .attr(`class`, `area`)
        .attr(`fill-opacity`, 0)

    areasEnter.merge(areas)
        .attr(`fill`, ([, {colors: colorKey}]) => `url(#gradient-line-${colorKey})`)
        .attr(`clip-path`, ([key]) => !isMaster(key) && `url(#clip${key})`)
        .transition(t)
        .attrTween(`d`, ([key, {values: map}]) => {
            const values = pairs(map)
            const interpolator = interpolateArray(values.map(() => 0), values.map(([, val]) => val))
            return tr => {
                const area = isMaster(key) ? masterArea : slaveArea
                return area(interpolator(tr).map((value, idx) => ([values[idx][0], value])))
            }
        })
        .transition().attr(`fill-opacity`, 1)

    /*lines*/
    const masterLine = lineChart()
        .curve(curveMonotoneX)
        .x(([key]) => xScale(key) + xScale.bandwidth() / 2)
        .y(([, value]) => yScale(value))

    const slaveLine = lineChart()
        .curve(curveMonotoneX)
        .x(([key]) => xScale(key) + xScale.bandwidth() / 2)
        .y(([key, value]) => value ? yScale(value) : yScale(master.values[key]))


    const lines = chart.selectAll(`.line`).data(set.sort(([key]) => isMaster(key) ? 1 : -1), ([key]) => key)

    lines.exit().remove()

    const linesEnter = lines.enter().append(`path`)
        .attr(`class`, `line`)
        .attr(`fill`, `none`)
        .attr(`stroke-linejoin`, `round`)
        .attr(`stroke-linecap`, `round`)
        .attr(`stroke-width`, 2)

    linesEnter.merge(lines)
        .attr(`clip-path`, ([key]) => !isMaster(key) && `url(#clip${key})`)
        .transition(t)
        .attr(`stroke`, ([, {colors: colorKey}]) => {
            const {border: {r, g, b}} = colors[colorKey]
            return `rgb(${r}, ${g}, ${b})`
        })
        .attrTween(`d`, ([key, {values: map}]) => {
            const values = pairs(map)
            const interpolator = interpolateArray(values.map(() => minValue), values.map(([, val]) => val))
            return tr => {
                const line = isMaster(key) ? masterLine : slaveLine
                return line(interpolator(tr).map((value, idx) => ([values[idx][0], value])))
            }
        })


    /* points */
    const getPointRadius = () => xScale.bandwidth() * symbolPointRatio
    const getPointX = ([, colKey]) => {
        return xScale(colKey) + xScale.bandwidth() / 2 - getPointRadius() / 2 + 1
    }

    const pointsData =
        set.sort(([key]) => isMaster(key) ? 1 : -1)
            .reduce((acc, [key, {values}]) => acc.concat(pairs(values).map(pair => ([key, ...pair]))), [])
            .filter(([, , value]) => value)

    const points = chart.selectAll(`.point`).data(pointsData, ([rowKey, colKey]) => rowKey + colKey)

    points.exit().remove()

    const pointsEnter = points.enter().append(`circle`)
        .attr(`class`, `point`)
        .attr(`stroke-width`, 2)
        .attr(`fill`, colorSettings.point)

    pointsEnter.merge(points)
        .transition(t)
        .attr(`r`, () => getPointRadius())
        .attr(`cx`, getPointX)
        .attr(`cy`, ([, , value]) => yScale(value))
        .attr(`stroke`, ([rowKey]) => {
            const [, {colors: colorKey}] = set.find(([key]) => key === rowKey)
            const {border: {r, g, b}} = colors[colorKey]
            return `rgb(${r}, ${g}, ${b})`
        })
}