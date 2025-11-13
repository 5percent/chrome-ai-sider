function approval() {
  // TODO: 实现具体的审批逻辑
  console.log("执行PMS审批操作");
}

function approvalAsync() {
  return new Promise((resolve) => {
    approval();
    setTimeout(resolve, 2000);
  });
}

async function loopWithInterval($domArr) {
  let i = 0;
  while (i < $domArr.length) {
    $domArr[i].click();
    await approvalAsync();
    i++;
  }
}

export default async function pmsApproval() {
  let $list = [];
  // TODO: 修改选择器以匹配实际的审批按钮
  document.querySelectorAll(".ant-btn-link").forEach(($dom) => {
    if ($dom.innerHTML.indexOf("待审批") !== -1) {
      $list.push($dom);
    }
  });

  if ($list.length > 0) {
    await loopWithInterval($list, 1000);
  } else {
    alert("已经没有待审批的项目了");
  }
}
