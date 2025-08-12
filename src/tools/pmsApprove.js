function approve() {
  const $develop = document.querySelectorAll("div#developOper")[0];
  $develop.click();

  $develop.parentNode
    .querySelectorAll(".ant-select-dropdown li")
    .forEach(($dom) => {
      if ($dom.innerHTML === "鲁喆") $dom.click();
    });

  const $test = document.querySelectorAll("div#testOper")[0];
  $test.click();

  $test.parentNode
    .querySelectorAll(".ant-select-dropdown li")
    .forEach(($dom) => {
      if ($dom.innerHTML === "葛世元") $dom.click();
    });

  const $confirm = document.querySelectorAll(
    ".ant-modal-footer .ant-btn-primary"
  )[0];
  $confirm.click();
}

function approveAsync() {
  return new Promise((resolve) => {
    approve();
    setTimeout(resolve, 2000);
  });
}

async function loopWithInterval($domArr) {
  let i = 0;
  while (i < $domArr.length) {
    $domArr[i].click();
    await approveAsync();
    i++;
  }
}

export default async function pmsApprove() {
  let $list = [];
  document.querySelectorAll(".ant-btn-link").forEach(($dom) => {
    if ($dom.innerHTML.indexOf("PRD评审") !== -1) {
      $list.push($dom);
    }
  });

  if ($list.length > 0) {
    await loopWithInterval($list, 1000);
  } else {
    alert("已经没有待审批的PRD评审了");
  }
}
