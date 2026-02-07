import { type Save } from "ts-macros";

type CounterData = {
    color: string;
    startCount: number;
}


export function $createCounters(attachTo: Save<HTMLElement>, counters: Array<CounterData>) : void {
  +[[counters], (counterData: CounterData) => {
    let counter = 0;
    const btn = document.createElement("button");

    btn.style.backgroundColor = counterData.color;

    const setCount = (count: number) => {
      counter = count;;
      btn.innerHTML = `count is ${count}`;
    }

    btn.addEventListener("click", () => setCount(counter + 1));
    setCount(counterData.startCount);

    attachTo.appendChild(btn);
  }]
}

$createCounters!(document.body, [{
    color: 'red',
    startCount: 0
}, {
    color: 'blue',
    startCount: 10
}])