import {rgbaToRgb} from "./utils";

export const symbolRatio = 1.7556
export const symbolIndentRatio = 0.54
export const symbolBodyRatio = 0.68
export const symbolTextRatio = symbolBodyRatio * 0.5
export const symbolPointRatio = 0.05
export const fontAspectRatio = 0.5
export const fontFamilyPrimary = `'Gotham CE', 'Gotham', sans-serif`
export const fontSize = 20
export const labelOffset = fontSize * 3
export const margin = {bottom: 85, right: 0, top: fontSize, left: 0}

export const colors = {
    tick: `#dcdee6`,
    label: `#000`,
    line: `#808285`,
    area: `#dcdee6`,
    point: `#fff`,
    doughnutStroke: `#eaf6fe`,
    doughnutCenter: `#28225c`,
}

export const transparentColor = {
    start: {r: 0, g: 0, b: 0, a: 0},
    end: {r: 0, g: 0, b: 0, a: 0},
    border: {r: 0, g: 0, b: 0, a: 0},
}

const brandColors = [
    {r: 206, g: 2, b: 32},
    {r: 227, g: 6, b: 19},
    {r: 244, g: 69, b: 0},
    {r: 249, g: 116, b: 8},
    {r: 245, g: 156, b: 0},
    {r: 253, g: 195, b: 0},
    {r: 255, g: 222, b: 20},
    {r: 65, g: 192, b: 240},
    {r: 7, g: 169, b: 219},
    {r: 12, g: 139, b: 188},
    {r: 0, g: 120, b: 179},
    {r: 25, g: 97, b: 155},
    {r: 29, g: 68, b: 130},
    {r: 21, g: 43, b: 122},
    {r: 41, g: 35, b: 92},
    {r: 167, g: 169, b: 172},
]

export const colorSets = brandColors
    .map((color) => ({
        start: {r: 255, g: 255, b: 255, a: 1},
        end: {...rgbaToRgb({...color, a: 0.5}), a: 1},
        border: {...color, a: 1},
    }))