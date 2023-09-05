import sample from './sample.json';
import { draw } from '../src/chart';
import '../src/style.css';

const element = document.getElementById('app');
if (element) draw(element, sample);
