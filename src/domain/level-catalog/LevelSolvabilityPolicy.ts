import { Direction } from "./enums/Direction.js";
import type { ArrowSpec } from "./value-objects/ArrowSpec.js";
import type { LevelDefinition } from "./value-objects/LevelDefinition.js";
import type { Position } from "./value-objects/Position.js";

export class LevelSolvabilityPolicy {
  isSolvable(definition: LevelDefinition): boolean {
    const blockingGraph = this.buildBlockingGraph(definition.arrows);
    return this.isAcyclic(blockingGraph);
  }

  private buildBlockingGraph(arrows: readonly ArrowSpec[]): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();
    for (const arrow of arrows) {
      graph.set(arrow.id, new Set<string>());
    }

    for (const blocked of arrows) {
      for (const blocker of arrows) {
        if (blocked.id === blocker.id) continue;
        if (this.blocks(blocked, blocker)) {
          graph.get(blocker.id)!.add(blocked.id);
        }
      }
    }

    return graph;
  }

  private blocks(blocked: ArrowSpec, blocker: ArrowSpec): boolean {
    return blocker.path.some((cell) =>
      LevelSolvabilityPolicy.isStrictlyAhead(blocked.head, blocked.direction, cell)
    );
  }

  private isAcyclic(graph: Map<string, Set<string>>): boolean {
    const indegree = new Map<string, number>();
    for (const node of graph.keys()) {
      indegree.set(node, 0);
    }
    for (const neighbors of graph.values()) {
      for (const neighbor of neighbors) {
        indegree.set(neighbor, (indegree.get(neighbor) ?? 0) + 1);
      }
    }

    const queue = [...indegree.entries()]
      .filter(([, degree]) => degree === 0)
      .map(([node]) => node);
    let visited = 0;

    while (queue.length > 0) {
      const node = queue.shift()!;
      visited += 1;
      for (const neighbor of graph.get(node) ?? []) {
        const nextDegree = (indegree.get(neighbor) ?? 0) - 1;
        indegree.set(neighbor, nextDegree);
        if (nextDegree === 0) queue.push(neighbor);
      }
    }

    return visited === graph.size;
  }

  private static isStrictlyAhead(head: Position, direction: Direction, cell: Position): boolean {
    switch (direction) {
      case Direction.UP:
        return cell.col === head.col && cell.z === head.z && cell.row < head.row;
      case Direction.DOWN:
        return cell.col === head.col && cell.z === head.z && cell.row > head.row;
      case Direction.LEFT:
        return cell.row === head.row && cell.z === head.z && cell.col < head.col;
      case Direction.RIGHT:
        return cell.row === head.row && cell.z === head.z && cell.col > head.col;
      case Direction.FORWARD:
        return cell.row === head.row && cell.col === head.col && cell.z > head.z;
      case Direction.BACK:
        return cell.row === head.row && cell.col === head.col && cell.z < head.z;
    }
  }
}
