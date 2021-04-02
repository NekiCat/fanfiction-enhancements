import { environment } from "../util/environment";
import Enhancer from "./Enhancer";
import { StoryCard } from "./components";
import { ValueContainer } from "../api";

import "./StoryProfile.css";

export default class StoryProfile implements Enhancer {
  constructor(private readonly valueContainer: ValueContainer) {}

  public async enhance(): Promise<any> {
    const profile = document.getElementById("profile_top");
    if (!profile || !environment.currentStoryId) {
      return;
    }

    const story = await this.valueContainer.getStory(environment.currentStoryId);
    if (!story) {
      return;
    }

    const card = StoryCard({ story });

    // profile.parentElement.replaceChild(card, profile);
    profile.parentElement?.insertBefore(card, profile);
    profile.style.display = "none";
  }
}
