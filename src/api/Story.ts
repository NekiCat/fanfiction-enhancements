import { Story as StoryData, User } from "ffn-parser";
import Chapter from "./Chapter";
import { SmartValue } from "./SmartValue";
import ValueContainer from "./ValueContainer";

export default class Story {
  public readonly id: number;

  public readonly title: string;

  public readonly description: string;

  public readonly chapters: Chapter[];

  public readonly imageUrl: string | undefined;

  public readonly imageOriginalUrl: string | undefined;

  public readonly favorites: number;

  public readonly follows: number;

  public readonly reviews: number;

  public readonly genre: string[];

  public readonly language: string;

  public readonly published: Date;

  public readonly updated: Date | undefined;

  public readonly rating: StoryData["rating"];

  public readonly words: number;

  public readonly characters: string[][];

  public readonly status: StoryData["status"];

  public readonly universes: string[];

  public readonly author: User;

  public readonly alert: SmartValue<boolean>;

  public readonly favorite: SmartValue<boolean>;

  constructor(data: StoryData, valueManager: ValueContainer) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.chapters = data.chapters ? data.chapters.map((chapter) => new Chapter(data.id, chapter, valueManager)) : [];
    this.imageUrl = data.imageUrl;
    this.imageOriginalUrl = data.imageUrl;
    this.favorites = data.favorites;
    this.follows = data.follows;
    this.reviews = data.reviews;
    this.genre = data.genre;
    this.language = data.language;
    this.published = data.published instanceof Date ? data.published : new Date(data.published);
    this.updated = data.updated == null || data.updated instanceof Date ? data.updated : new Date(data.updated);
    this.rating = data.rating;
    this.words = data.words;
    this.characters = data.characters;
    this.status = data.status;
    this.universes = data.universes;

    this.author = {
      id: data.author.id,
      name: data.author.name,
    };
    this.alert = valueManager.getAlertValue(data.id);
    this.favorite = valueManager.getFavoriteValue(data.id);
  }

  public async isRead(): Promise<boolean> {
    const read = await Promise.all(this.chapters.map((chapter) => chapter.read.get()));

    return read.every((r) => r);
  }

  public async setRead(read: boolean): Promise<void> {
    await Promise.all(this.chapters.map((chapter) => chapter.read.set(read)));
  }
}
