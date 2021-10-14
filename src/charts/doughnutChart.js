import {
    transition,
    pie,
    arc,
    interpolate,
} from 'd3'
import {sortData} from "../chart"

export function redrawDoughnutChart({chart, set, colors, cols, width, sortDirection, sortType}) {

    const t = transition().duration(1000).delay(1000)
    const data =
        pie().value(([, value]) => value).sort(null)(set.sort(sortData(sortType, sortDirection, cols)).map(val => val))

    const radius = width / 2
    const innerRadius = radius * 0.55

    const pieGen = arc()
        .innerRadius(innerRadius)
        .outerRadius(radius)

    const arcTween = (newData, idx) => {
        const initData = {
            ...newData,
            data: [newData.data[0], 0],
            endAngle: 0,
            padAngle: 0,
            startAngle: 0,
            value: 0,
        }
        const interpolator = interpolate(initData, newData)
        return function(tr) {
            const sth = interpolator(tr)
            return pieGen(sth, idx)
        }
    }

    // wrapper
    const doughnut = chart.selectAll(`.doughnut`).data([1]).enter()
        .append(`g`)
        .attr(`class`, `doughnut`)
        .attr(`transform`, `translate(${width / 2}, ${width / 2})`)

    // arcs
    const arcs = chart.select(`.doughnut`).selectAll(`.arc`).data(data, ({data: [key]}) => key)
    arcs.exit().remove()
    const arcsEnter = arcs.enter().append(`path`)
        .attr(`class`, `arc`)

    arcsEnter.merge(arcs)
        .transition(t)
        .attrTween(`d`, arcTween)
        .attr(`fill`, (d, idx) => {
            const [key] = set[idx]
            const {colors: colorKey} = cols[key]
            const {border: {r, g, b}} = colors[colorKey]
            return `rgb(${r}, ${g}, ${b})`
        })

    // center
    const center = doughnut.selectAll(`.center`).data([1])
    const centerEnter = center.enter()
        .append(`circle`)
        .attr(`class`, `center`)
        .attr(`stroke`, `white`)
        .attr(`stroke-width`, 60)
        .attr(`stroke-opacity`, 0.8)
        .attr(`cx`, 0)
        .attr(`cy`, 0)
        .attr(`fill`, `none`)
        .attr(`r`, 0)

    centerEnter.merge(center)
        .transition()
        .duration(500)
        .attr(`r`, innerRadius)

}