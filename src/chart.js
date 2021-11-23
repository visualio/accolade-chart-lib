import {makeAbsolute, parseSVG} from "svg-path-parser"
import {
    symbolRatio, fontAspectRatio, margin, colors, fontFamilyPrimary,
    colors as colorSettings, fontSize, labelOffset,
} from "./settings"
import {
    CHART_TYPE_BAR,
    CHART_TYPE_DOUGHNUT,
    CHART_TYPE_LINE,
    CHART_TYPE_TABLE, LOCALE_CZECH, LOCALE_ENGLISH,
    SORT_DIRECTION_DESC, SORT_TYPE_KEY,
    SORT_TYPE_ORIGINAL, SORT_TYPE_VALUE,
} from "./constants"
import pairs from "lodash.pairs"
import {axisBottom, scaleBand, scaleLinear, axisRight, format, formatDefaultLocale, select} from "d3"
import {redrawBarChart} from "./charts/barChart"
import {redrawLineChart} from "./charts/lineChart"
import {redrawDoughnutChart} from "./charts/doughnutChart"
import {getMaxLength, isNumeric} from "./utils"
import {updateTable} from "./charts/table";


/*
* Chart General
* */
export function isBarChart(type) {
    return type === CHART_TYPE_BAR
}

export function isDoughnutChart(type) {
    return type === CHART_TYPE_DOUGHNUT
}

export function isLineChart(type) {
    return type === CHART_TYPE_LINE
}

export function isChart(type) {
    return (
        type === CHART_TYPE_BAR ||
        type === CHART_TYPE_DOUGHNUT ||
        type === CHART_TYPE_LINE
    )
}

export function isTable(type) {
    return type === CHART_TYPE_TABLE
}

export function getChartWidth(state) {
    return state.width - getChartLeftMargin(state)
}

export function getChartHeight(state) {
    return state.height - getChartBottomMargin(state)
}

export function getChartLeftMargin({rows, chartType, verticalLabel}) {
    if (isDoughnutChart(chartType))
        return 0
    return getMaxLength(rows) * fontSize * fontAspectRatio + (verticalLabel ? labelOffset : 0)
}

export function getChartTopMargin({chartType}) {
    if (isDoughnutChart(chartType))
        return 0
    return margin.top
}

export function getChartBottomMargin({chartType}) {
    if (isDoughnutChart(chartType))
        return 0
    return margin.bottom + labelOffset
}

export function getChartSpecificData({chartType, rows}, forScales = true) {
    if (isLineChart(chartType)) {
        if (!forScales)
            return pairs(rows)
        const maxValues = {}
        Object.keys(rows).forEach(rowKey => {
            Object.keys(rows[rowKey].values).forEach(valueKey => {
                maxValues[valueKey] =
                    (parseInt(maxValues[valueKey], 10) > rows[rowKey].values[valueKey]) ?
                        maxValues[valueKey] :
                        rows[rowKey].values[valueKey]
            })
        })
        return pairs(maxValues)
    }

    const [rowKey] = Object.keys(rows)
    return pairs(rows[rowKey].values)
}

export function prepareChart(wrapper, state) {
    const set = getChartSpecificData(state)
    const xAxis = createXAxis(set, state)
    const yAxis = createYAxis(set, state)
    const svg = wrapper
        .append(`svg`)
        .attr(`viewBox`, `0 0 ${state.width} ${state.height}`)
        .attr(`fontStyle`, `normal`)
        .attr(`fontFamily`, fontFamilyPrimary)
    const chart = svg
        .append(`g`)
        .attr(`transform`, `translate(${getChartLeftMargin(state)}, ${getChartTopMargin(state)})`)
    chart.append(`g`)
        .attr(`class`, `axis axis--y`)
        .call(yAxis)
    chart.append(`g`)
        .attr(`class`, `axis axis--x`)
        .attr(`transform`, `translate(0, ${getChartHeight(state)})`)
        .call(xAxis)
    chart.append(`defs`)
    return chart
}

export function createXAxis(set, state) {

    if (isDoughnutChart(state.chartType))
        return () => null

    const scale = createXScale(set, state)

    return g => {
        const axis = axisBottom(scale).tickSize(0)
        g.call(axis)
        g.select(`.domain`).remove()
        const text = g.selectAll(`.tick text`)
            .attr(`font-size`, fontSize)
            .attr(`font-family`, fontFamilyPrimary)
            .attr(`dy`, 16)
            .attr(`fill`, colors.label)
            .text(``)

        text.append(`tspan`)
            .attr(`dy`, `1.4em`)
            .attr(`x`, `0`)
            .text(key => getLegendLine(state.cols[key].value, state.locale, 0))

        text.append(`tspan`)
            .attr(`dy`, `1.4em`)
            .attr(`x`, `0`)
            .text(key => getLegendLine(state.cols[key].value, state.locale, 1))

        text.append(`tspan`)
            .attr(`dy`, `1.4em`)
            .attr(`x`, `0`)
            .text(key => getLegendLine(state.cols[key].value, state.locale, 2))
    }
}

function getLegendLine(value, locale, index) {
    const [alfa, beta, gama, delta] = value.split(/\.|\s|\.\s|\.&nbsp;|&nbsp;/).filter(Boolean)
    const isDate = [alfa, beta, gama].every(i => parseInt(i, 10))
    if (isDate)
        return (locale === `cs` ? [`${alfa}. ${beta}.`, gama, delta] : [`${alfa}.${beta}.`, gama, delta])[index]
    return [alfa, beta, gama, delta][index]
}

export function createYAxis(set, state) {
    setFormatLocale(state.locale)

    if (isDoughnutChart(state.chartType))
        return () => null

    const scale = createYScale(set, state)
    const chartWidth = getChartWidth(state)

    return g => {
        const axis = axisRight(scale).tickSize(chartWidth).tickPadding(0)
        g.call(axis)
        g.select(`.domain`).remove()
        g.selectAll(`.tick line`)
            .attr(`opacity`, (d) => d > Math.max(...set.map(([, val]) => val)) ? 0 : 1)
            .attr(`stroke`, colors.tick)

        g.selectAll(`.tick text`)
            .text(d => format(`,`)(d))
            .attr(`opacity`, (d) => d > Math.max(...set.map(([, val]) => val)) ? 0 : 1)
            .attr(`font-size`, fontSize)
            .attr(`font-family`, fontFamilyPrimary)
            .attr(`fill`, colors.label)
            .attr(`x`, -10)
            .attr(`dy`, 6)
            .attr(`text-anchor`, `end`)
    }
}

export function createXScale(set, state) {
    return scaleBand()
        .domain(set.map(([key]) => key))
        .rangeRound([0, getChartWidth(state)])
        .padding(isBarChart(state.chartType) ? 0.33 : 0)
}

export function createYScale(set, state) {
    const {rows, chartType} = state
    const allValues = Object.values(rows)
        .reduce((acc, curr) => acc.concat(Object.values(curr.values)), [])
        .filter(isNumeric)

    // upperBound ratio (sufficient padding top hack)
    let ratio = 1
    if (isBarChart(chartType)) {
        const xScale = createXScale(set, state)
        const symbolHeight = xScale.bandwidth() * symbolRatio
        const height = getChartHeight(state)
        ratio = ((height + symbolHeight) / height) * 1.1
    } else if (isLineChart(chartType)) {
        ratio = 1.05
    }

    const lowerBound = isLineChart(chartType) ? Math.min(...allValues) : 0
    const upperBound = Math.max(...allValues) * ratio

    return scaleLinear()
        .domain([lowerBound, upperBound])
        .range([getChartHeight(state), 0])
}

export function renderChart(set, state, chart) {
    setFormatLocale(state.locale)
    const {chartType, horizontalLabel, verticalLabel, sortDirection, sortType} = state
    const settings = {
        set: getChartSpecificData(state, !isLineChart(chartType)),
        height: getChartHeight(state),
        width: getChartWidth(state),
        xScale: createXScale(set, state),
        yScale: createYScale(set, state),
        colors: state.colors,
        cols: state.cols,
        unit: state.unit,
        locale: state.locale,
        labels: {horizontalLabel, verticalLabel},
        sortDirection,
        sortType,
        chart,
    }

    if (isBarChart(chartType))
        return redrawBarChart(settings)
    if (isLineChart(chartType))
        return redrawLineChart(settings)
    if (isDoughnutChart(chartType))
        return redrawDoughnutChart(settings)

    return true
}

export function renderHeader({title: titleText, subtitle: subtitleText}, element) {
    if (!titleText && !subtitleText)
        return
    const header = document.createElement(`header`)
    header.className = `header`
    const title = document.createElement(`h1`)
    const subtitle = document.createElement(`h2`)
    title.innerHTML = titleText
    subtitleText.split(`|`).forEach(part => {
        const span = document.createElement(`span`)
        span.innerHTML = part.trim()
        subtitle.appendChild(span)
    })
    header.appendChild(title)
    header.appendChild(subtitle)
    element.insertAdjacentElement(`afterbegin`, header)
}

export function sortData(sortType, sortDirection, cols) {
    const isDesc = sortDirection === SORT_DIRECTION_DESC
    return ([keyA, valA], [keyB, valB]) => {
        if (sortType === SORT_TYPE_ORIGINAL)
            return isDesc ? -1 : 1
        if (sortType === SORT_TYPE_VALUE)
            return (valA - valB) * (isDesc ? -1 : 1)
        if (sortType === SORT_TYPE_KEY) {
            return (cols[keyA].value > cols[keyB].value ? 1 : -1) * (isDesc ? -1 : 1)
        }
        return -1 // reverse the order by default
    }
}

export function renderChartFooter(set, {cols, colors: colorMap, unit, displayLegend, sortType, sortDirection, locale}, element) {
    if (displayLegend === false)
        return false
    const footer = document.createElement(`footer`)
    footer.className = `footer`
    set
        .sort(sortData(sortType, sortDirection, cols))
        .forEach(([colKey, value]) => {
            const {colors: colorKey, value: label} = cols[colKey]
            const {border: {r, g, b}} = colorMap[colorKey]

            const lineElem = document.createElement(`div`)
            lineElem.className = `line`

            const colorElem = document.createElement(`div`)
            colorElem.className = `color`
            colorElem.style.backgroundColor = `rgb(${r}, ${g}, ${b})`

            const valueElem = document.createElement(`div`)
            valueElem.className = `value`
            valueElem.innerHTML = `${format(``)(value)}${unit ? `${unit === `%` && locale === `en` ? `` : `&nbsp;`}${unit}` : ``}`

            const labelElem = document.createElement(`div`)
            labelElem.className = `label`
            labelElem.innerHTML = label

            lineElem.appendChild(colorElem)
            lineElem.appendChild(labelElem)
            lineElem.appendChild(valueElem)
            footer.appendChild(lineElem)
        })

    element.insertAdjacentElement(`beforeend`, footer)
    return true
}

/*
* Bar
* */
export function createTextObject([, number]) {
    const [, value, unit] = /([^a-zA-Z]*)([a-zA-Z]?)/g.exec(format(`~s`)(number))
    const sign = number < 0 ? `-` : `+`
    return {value, unit, sign}
}

const barSymbol = `M9.2 5.3H6.6C6.5 5.1 6.5 4.9 6.4 4.8L3.8 0.3C3.5 -0.1 3.2 -0.1 3 0.3L0.4 4.8C0.2 5.2 0 5.8 0 6.2V11.4C0 11.8 0.3 12.2 0.8 12.2H3.4C3.5 12.4 3.5 12.6 3.6 12.7L6.2 17.2C6.4 17.6 6.7 17.6 7 17.2L9.6 12.7C9.8 12.3 10 11.7 10 11.3V6.1C10 5.7 9.7 5.3 9.2 5.3`
const barSymbolCommands = makeAbsolute(parseSVG(barSymbol))

export function createBarSymbol(x, y, barWidth) {
    const modifyX = (pointX) => (pointX * barWidth / 10) + x
    const modifyY = (pointY) => (pointY * barWidth / 10) + y - (barWidth * symbolRatio)
    return modifySVGCommands(barSymbolCommands, modifyX, modifyY).join(``)
}

export function createBarPath(x, y, barWidth, chartHeight) {
    return [
        `M${x} ${y - barWidth * symbolRatio / 2}`,
        `L${x} ${chartHeight}`,
        `L${x + barWidth} ${chartHeight}`,
        `L${x + barWidth} ${y - barWidth * symbolRatio / 2}`,
        `Z`,
    ].join(` `)
}

export function modifySVGCommands(commands, xModificator, yModificator) {
    return commands.map(i => {
        switch (i.code) {
            case `M`: {
                return `M${xModificator(i.x)} ${yModificator(i.y)}`
            }
            case `C`: {
                return `C${xModificator(i.x1)} ${yModificator(i.y1)} ${xModificator(i.x2)} ${yModificator(i.y2)} ${xModificator(i.x)} ${yModificator(i.y)}`
            }
            case `L`: {
                return `L${xModificator(i.x)} ${yModificator(i.y)}`
            }
            case `V`: {
                return `V${yModificator(i.y)}`
            }
            case `H`: {
                return `H${xModificator(i.x)}`
            }
            default: {
                return ``
            }
        }
    }).filter(i => i)
}

export function getSymbolCenter(width) {
    return width * symbolRatio / 2
}

/* Labels */
export function createLabels(chart, labels, width, height, maxValueLength) {
    const verticalLabel = chart.selectAll(`.verticalLabel`).data([1])
    const verticalMove = -1 * (maxValueLength + 1) * fontSize * fontAspectRatio
    const verticalLabelEnter = verticalLabel.enter()
        .append(`text`)
        .attr(`class`, `verticalLabel`)
        .attr(`x`, verticalMove)
        .attr(`transform`, `rotate(-90, ${verticalMove}, ${height})`)
        .attr(`y`, height)
        .attr(`font-family`, fontFamilyPrimary)
        .attr(`fill`, colorSettings.label)
        .attr(`fill-opacity`, 0)
    verticalLabelEnter.merge(verticalLabel)
        .text(labels.verticalLabel).transition().duration(1000).attr(`fill-opacity`, 1)

    const topLeftLabel = chart.selectAll(`.topLeftLabel`).data([1])
    topLeftLabel.enter()
        .append(`text`)
        .attr(`class`, `topLeftLabel`)
        .attr(`x`, 0)
        .attr(`y`, 0)
        .attr(`font-family`, fontFamilyPrimary)
        .attr(`fill`, colorSettings.label)

    const topRightLabel = chart.selectAll(`.topRightLabel`).data([1])
    topRightLabel.enter()
        .append(`text`)
        .attr(`class`, `topRightLabel`)
        .attr(`x`, width - 20)
        .attr(`y`, 0)
        .attr(`font-family`, fontFamilyPrimary)
        .attr(`fill`, colorSettings.label)
        .attr(`fill-opacity`, 1)
        .attr(`text-anchor`, `end`)

    const bottomRightLabel = chart.selectAll(`.bottomRightLabel`).data([1])
    const bottomRightLabelEnter = bottomRightLabel.enter()
        .append(`text`)
        .attr(`class`, `bottomRightLabel`)
        .attr(`x`, width - 20)
        .attr(`y`, height + labelOffset * 1.75)
        .attr(`font-family`, fontFamilyPrimary)
        .attr(`fill`, colorSettings.label)
        .attr(`text-anchor`, `end`)
    bottomRightLabelEnter.merge(bottomRightLabel)
        .text(labels.horizontalLabel).transition().duration(1000).attr(`fill-opacity`, 0.5)
}

export function setFormatLocale(locale) {
    const localeMap = {
        [LOCALE_CZECH]: {
            decimal: `,`,
            thousands: ` `,
            grouping: [3],
            currency: [``, ` Kč`],
        },
        [LOCALE_ENGLISH]: {
            decimal: `.`,
            thousands: `,`,
            grouping: [3],
            currency: [`£`, ``],
        },
    }
    return formatDefaultLocale(localeMap[locale] || localeMap[LOCALE_CZECH])
}

export default function(element, state) {
    if (isChart(state.chartType)) {
        state.height = isDoughnutChart(state.chartType) ? state.width : state.height
        const root = select(element)
            .attr(`class`, `renderer ${state.chartType}-chart ${state.orientation}`)

        const chart = prepareChart(root, state)
        const set = getChartSpecificData(state)
        renderChart(set, state, chart)
        renderHeader(state, element)
        renderChartFooter(set, state, element)

        return (newState) => {
            const set = getChartSpecificData(newState)
            chart.select(`.axis--y`).call(createYAxis(set, newState))
            chart.select(`.axis--x`).call(createXAxis(set, newState))
            renderChart(set, newState, chart)
            element.querySelector("header").remove()
            renderHeader(newState, element)
            element.querySelector("footer").remove()
            renderChartFooter(set, newState, element)
        }

    } else if (isTable(state.chartType)) {
        // table render
        element.classList.add(`table`)
        const table = document.createElement(`table`)
        table.className = `table`
        const tableWrapper = document.createElement(`div`)
        tableWrapper.className = `table-wrapper`

        renderHeader(state, element)
        updateTable(table, state)

        tableWrapper.appendChild(table)
        element.appendChild(tableWrapper)

        const step = 0.75 * window.innerWidth
        const tableTitle = renderTableTitle(state.tableTitle, tableWrapper, step)
        element.insertBefore(tableTitle, tableWrapper)

        // set cell max height for rows
        const tableRows = [...table.querySelectorAll(`tr`)]
        tableRows.forEach(row => {
            const heights = [...row.children].map(cell => cell.getBoundingClientRect().height)
            row.style.setProperty(`--cellHeight`, `${Math.max(...heights)}px`)
        })

        return (newState) => {
            updateTable(table, newState)
        }
    }
}