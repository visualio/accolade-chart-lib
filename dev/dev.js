import sample from "./sample.json";
import draw from "../src/chart.js"
import "../src/style.css"

draw(
    document.getElementById("app"),
    sample
)