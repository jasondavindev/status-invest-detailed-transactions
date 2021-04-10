# Status Invest detailed transactions

## Running

Log in the [Status Invest portal](https://statusinvest.com.br/) and get the cookie named `.StatusInvest`. Pass this cookie to environment variable `COOKIE`.

Example

```bash
export COOKIE=".StatusInvest=YOUR_COOKIE_HERE"
```

Set the ticker name in the `TICKER` environment variable.

Example

```bash
export TICKER=ITSA4
```

Then run the application

```bash
COOKIE="YOUR_COOKIE_HERE" TICKER="ITSA4" node index.js
```

The output will be in JSON format. For save the content, forward to output

```bash
COOKIE="YOUR_COOKIE_HERE" TICKER="ITSA4" node index.js > /tmp/output.json
```

### With Docker

```bash
docker run --rm -ti -e COOKIE="YOUR_COOKIE_HERE" -e TICKER="ITSA4" -w /app -v $PWD:/app node:14 bash -c "npm i; node index.js > /tmp/output.json"
```

## Output example

```json
[
  {
    "code": "ITSA4",
    "quantity": 10,
    "unitValue": 9.0,
    "totalValue": 90.0,
    "referenceDate": "2021-02-18T00:00:00",
    "rank": 20210218,
    "operation": "compra",
    "newAvgPrice": 9.0,
    "newPosition": 10,
    "prevPosition": 0,
    "prevAvgPrice": 0
  },
  ... other transactions
]
```

The output shows the profit whether the transactions is a sale (`venda`) in the profix field.

Example

```json
{
  "code": "OIBR3",
  "quantity": 400,
  "unitValue": 1.51,
  "totalValue": 604,
  "referenceDate": "2020-10-29T00:00:00",
  "rank": 20201029,
  "operation": "venda",
  "newAvgPrice": 0,
  "newPosition": 0,
  "prevPosition": 400,
  "prevAvgPrice": 1.44,
  "profit": 28
}
```
