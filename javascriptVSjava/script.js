document.addEventListener("DOMContentLoaded", function() {
    const toc = document.getElementById("toc");
    const jsSection = document.querySelector(".js"); // JavaScriptセクションを特定
    const headers = jsSection.querySelectorAll("h3"); // JavaScriptセクション内のh3要素を取得

    headers.forEach((header, index) => {
        const listItem = document.createElement("li");
        const link = document.createElement("a");
        const id = `header-${index}`;

        // 各h3にIDを設定
        header.id = id;
        link.href = `#${id}`;
        link.textContent = header.textContent;

        listItem.appendChild(link);
        toc.appendChild(listItem);
    });
});