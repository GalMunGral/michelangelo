import { HScroll } from "../HScroll.js";
import { Text } from "../Text.js";
import { VStack } from "../VStack.js";
import { Card } from "./Card.js";
import { Observable } from "../Observable.js";
import { createElement } from "../util.js";

export function Section({ title }: { title: string }) {
  return (
    <VStack dimension={[Infinity, 400]}>
      <Text
        dimension={[Infinity, 64]}
        margin={[20, 20, 20, 20]}
        textAlign="start"
        fontSize={24}
        fontWeight={600}
        color={[255, 255, 255, 1]}
      >
        {title}
      </Text>
      <HScroll
        dimension={[Infinity, 300]}
        data={loadAlbums(title)}
        renderItem={({ url, id, title, description }) => {
          return (
            <Card id={id} url={url} title={title} description={description} />
          );
        }}
      />
    </VStack>
  );
}

function loadAlbums(sectionId: string) {
  return new Observable<
    Array<{ id: string; url: string; title: string; description: string }>
  >((f) => {
    f(
      Array(10)
        .fill(0)
        .map((_, i) => ({
          id: sectionId + i,
          url:
            i % 2
              ? "https://dailymix-images.scdn.co/v2/img/ab6761610000e5ebd969cf117d0b0d4424bebdc5/2/en/default"
              : "https://dailymix-images.scdn.co/v2/img/ab6761610000e5ebb99713cdd2a68b0db306aad6/3/en/default",

          title: "Daily Mix " + i,
          description: "test test test " + i,
        }))
    );
    return () => {};
  });
}
