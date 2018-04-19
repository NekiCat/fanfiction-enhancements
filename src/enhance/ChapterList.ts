import { environment } from "../util/environment";
import { Enhancer } from "./Enhancer";

import "./ChapterList.css";

export class ChapterList implements Enhancer {
	public constructor(private document: Document) {
	}

	public enhance() {
		const contentWrapper = this.document.getElementById("content_wrapper_inner");

		// clean up content
		Array.from(contentWrapper.children)
			.filter(e => (!e.textContent && (e as HTMLDivElement).style.height === "5px")
				|| (e.firstElementChild && e.firstElementChild.nodeName === "SELECT")
				|| e.className === "lc-wrapper")
			.forEach(e => contentWrapper.removeChild(e));
		contentWrapper.removeChild(this.document.getElementById("storytextp"));

		// add chapter list
		const chapterListContainer = this.document.createElement("div");
		chapterListContainer.className = "ffe-cl-container";

		const chapterList = this.document.createElement("div");
		chapterList.className = "ffe-cl";
		chapterListContainer.appendChild(chapterList);

		const list = this.document.createElement("ol") as HTMLOListElement;
		chapterList.appendChild(list);

		for (const chapter of environment.currentStory.chapters) {
			const $item = $(`<li class="ffe-cl-chapter"><span class="ffe-cl-read"><input type="checkbox"/></span>
				<span class="ffe-cl-chapter-title"><a href="/s/${environment.currentStoryId}/${chapter.id}/"
				>${chapter.name}</a></span></li>`);
			list.appendChild($item[0]);
		}

		contentWrapper.insertBefore(chapterListContainer, this.document.getElementById("review_success"));
	}
}