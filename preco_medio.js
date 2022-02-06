[
  [0.0003196, 89361.9],
  [0.0009113, 96499.99]
].reduce(precio_medio, [0, 0]);

function precio_medio(prev, cur) {
  let [qtd, price] = cur;
  let [medio, total] = prev;

  if (qtd > 0) {
    return [(medio * total + (qtd * price)) / (total + qtd), total + qtd];
  }

  return [medio, total + qtd];
}
