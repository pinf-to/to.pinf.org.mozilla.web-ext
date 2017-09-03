
console.log("Hello World from bg-worker1");

window.fetch('http://127.0.0.1:%%%PORT%%%/.result', {
    method: 'post',
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        suite: "bg-worker1",
        result: "all good"
    })
});
