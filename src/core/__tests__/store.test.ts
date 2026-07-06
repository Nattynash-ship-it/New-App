import { beforeAll, describe, expect, it } from "vitest";

// The persisted store touches localStorage at instantiation — shim it before
// the store module is (dynamically) imported.
beforeAll(() => {
  const mem = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
      clear: () => mem.clear(),
    },
  });
});

describe("profile + data management", () => {
  it("renames the profile", async () => {
    const { useHub } = await import("../store/hub");
    useHub.getState().setProfileName("Natasha");
    expect(useHub.getState().profile.name).toBe("Natasha");
  });

  it("completes onboarding with a name", async () => {
    const { useHub } = await import("../store/hub");
    useHub.getState().completeOnboarding("Alex");
    expect(useHub.getState().profile.name).toBe("Alex");
    expect(useHub.getState().profile.onboarded).toBe(true);
  });

  it("round-trips through export → import", async () => {
    const { useHub } = await import("../store/hub");
    useHub.getState().setProfileName("Backup Test");
    useHub.getState().addPantryItem("Test Ingredient", "pantry");
    const snapshot = useHub.getState().exportData();

    // mutate away from the snapshot
    useHub.getState().setProfileName("Different");
    expect(useHub.getState().profile.name).toBe("Different");

    // restore
    expect(useHub.getState().importData(snapshot)).toBe(true);
    expect(useHub.getState().profile.name).toBe("Backup Test");
    expect(useHub.getState().pantry.some((p) => p.name === "Test Ingredient")).toBe(true);
  });

  it("rejects invalid import payloads", async () => {
    const { useHub } = await import("../store/hub");
    expect(useHub.getState().importData("not json")).toBe(false);
    expect(useHub.getState().importData('{"nope":true}')).toBe(false);
  });

  it("resets to seed while keeping the profile", async () => {
    const { useHub } = await import("../store/hub");
    useHub.getState().completeOnboarding("Keeper");
    useHub.getState().addPantryItem("Ephemeral", "pantry");
    useHub.getState().resetToSeed();
    expect(useHub.getState().profile.name).toBe("Keeper");
    expect(useHub.getState().pantry.some((p) => p.name === "Ephemeral")).toBe(false);
    expect(useHub.getState().courses.length).toBeGreaterThan(0); // fresh seed present
  });

  it("edits role tags", async () => {
    const { useHub } = await import("../store/hub");
    useHub.getState().setRoles([" Mom ", "Student", "", "Runner"]);
    expect(useHub.getState().profile.roles).toEqual(["Mom", "Student", "Runner"]);
  });
});

describe("persist merge (older stored blobs)", () => {
  it("backfills fields added after a slice was first persisted", async () => {
    const { useHub } = await import("../store/hub");
    // Simulate localStorage written by an older build: a profile that predates
    // the `roles` field, and no wellness slices at all.
    const persistedState = { profile: { name: "Legacy User", onboarded: true } };
    // @ts-expect-error merge is defined in the persist options
    const merged = useHub.persist.getOptions().merge(persistedState, useHub.getState());
    expect(merged.profile.name).toBe("Legacy User");
    expect(merged.profile.onboarded).toBe(true);
    // The crashing field — must be defined, never undefined.
    expect(Array.isArray(merged.profile.roles)).toBe(true);
    // Wellness slices added later are backfilled from seed/defaults.
    expect(Array.isArray(merged.habits)).toBe(true);
    expect(typeof merged.water).toBe("object");
    expect(typeof merged.waterGoal).toBe("number");
  });
});

describe("wellness", () => {
  it("toggles a habit for today and back", async () => {
    const { useHub } = await import("../store/hub");
    const habit = useHub.getState().habits[0]!;
    const before = habit.history.length;
    useHub.getState().toggleHabitToday(habit.id);
    const after = useHub.getState().habits.find((h) => h.id === habit.id)!;
    // seed history includes today, so first toggle removes it
    expect(after.history.length).toBe(before - 1);
    useHub.getState().toggleHabitToday(habit.id);
    expect(useHub.getState().habits.find((h) => h.id === habit.id)!.history.length).toBe(before);
  });

  it("adds and removes a custom habit", async () => {
    const { useHub } = await import("../store/hub");
    useHub.getState().addHabit("Stretch", "🤸");
    const added = useHub.getState().habits.find((h) => h.name === "Stretch");
    expect(added?.icon).toBe("🤸");
    useHub.getState().removeHabit(added!.id);
    expect(useHub.getState().habits.some((h) => h.name === "Stretch")).toBe(false);
  });

  it("logs water without going negative", async () => {
    const { useHub } = await import("../store/hub");
    const { todayISO } = await import("../dates");
    useHub.getState().logWater(3);
    expect(useHub.getState().water[todayISO()]).toBe(3);
    useHub.getState().logWater(-10);
    expect(useHub.getState().water[todayISO()]).toBe(0);
  });
});

describe("fitness — equipment & library", () => {
  it("edits the equipment inventory", async () => {
    const { useHub } = await import("../store/hub");
    useHub.getState().setEquipment(["dumbbells", "kettlebell"]);
    expect(useHub.getState().equipment).toEqual(["dumbbells", "kettlebell"]);
  });

  it("adds a full library workout as a routine in one step", async () => {
    const { useHub } = await import("../store/hub");
    const before = useHub.getState().routines.length;
    useHub.getState().addRoutineWithExercises("Rower Intervals", "Cardio", [
      { name: "Warm-up", target: "3 min" },
      { name: "Intervals", target: "8 × 250m" },
    ]);
    const routine = useHub.getState().routines.find((r) => r.name === "Rower Intervals");
    expect(useHub.getState().routines.length).toBe(before + 1);
    expect(routine?.exercises).toHaveLength(2);
    expect(routine?.exercises[0]?.id).toMatch(/^ex_/); // ids were assigned
  });
});

describe("to-do list", () => {
  it("adds, reorders by urgency, changes urgency, toggles, and removes", async () => {
    const { useHub } = await import("../store/hub");
    useHub.getState().addTodo("Buy stamps", "low");
    const todo = useHub.getState().todos.find((t) => t.title === "Buy stamps");
    expect(todo?.urgency).toBe("low");
    expect(todo?.done).toBe(false);

    useHub.getState().setTodoUrgency(todo!.id, "high");
    expect(useHub.getState().todos.find((t) => t.id === todo!.id)?.urgency).toBe("high");

    useHub.getState().toggleTodo(todo!.id);
    expect(useHub.getState().todos.find((t) => t.id === todo!.id)?.done).toBe(true);

    useHub.getState().removeTodo(todo!.id);
    expect(useHub.getState().todos.some((t) => t.id === todo!.id)).toBe(false);
  });
});

describe("groceries from planned meals", () => {
  it("pulls ingredients from a planned library recipe onto the list", async () => {
    const { useHub } = await import("../store/hub");
    const { todayISO } = await import("../dates");
    const { RECIPE_LIBRARY } = await import("../data/recipeLibrary");

    // Start clean so pantry restock noise doesn't mask the recipe pull.
    useHub.setState({ pantry: [], plannedMeals: [], groceryList: [] });
    const recipe = RECIPE_LIBRARY[0]!;

    // Plan the library recipe (carrying its id, like the "Plan for dinner" button).
    useHub.getState().planMeal(todayISO(), "dinner", recipe.title, recipe.id);
    useHub.getState().generateGroceryList();

    const names = useHub.getState().groceryList.map((g) => g.name.toLowerCase());
    for (const ing of recipe.ingredients) {
      expect(names).toContain(ing.toLowerCase());
    }
  });

  it("bulk-adds grocery items, skipping ones already listed or on hand", async () => {
    const { useHub } = await import("../store/hub");
    useHub.setState({
      groceryList: [],
      pantry: [{ id: "p1", name: "Tofu", category: "protein", onHand: true }] as never,
    });
    const added = useHub.getState().addGroceryItems(["Tofu", "Soy sauce", "Brown rice", "soy sauce"]);
    // Tofu (on hand) and the duplicate "soy sauce" are skipped.
    expect(added).toBe(2);
    const names = useHub.getState().groceryList.map((g) => g.name);
    expect(names).toContain("Soy sauce");
    expect(names).toContain("Brown rice");
    expect(names).not.toContain("Tofu");
  });

  it("restores a removed grocery item without duplicating it", async () => {
    const { useHub } = await import("../store/hub");
    useHub.setState({ groceryList: [] });
    useHub.getState().addGroceryItem("Oat milk");
    const item = useHub.getState().groceryList[0]!;

    useHub.getState().removeGroceryItem(item.id);
    expect(useHub.getState().groceryList).toHaveLength(0);

    useHub.getState().restoreGroceryItem(item);
    expect(useHub.getState().groceryList.map((g) => g.name)).toEqual(["Oat milk"]);
    // Restoring again is a no-op (idempotent) — no duplicate id.
    useHub.getState().restoreGroceryItem(item);
    expect(useHub.getState().groceryList).toHaveLength(1);
  });
});

describe("undo channel", () => {
  it("pushes, runs, and dismisses an undoable action", async () => {
    const { useUndo } = await import("../store/undo");
    let restored = false;

    useUndo.getState().push("Done: Thing", () => {
      restored = true;
    });
    expect(useUndo.getState().toast?.message).toBe("Done: Thing");

    useUndo.getState().run();
    expect(restored).toBe(true);
    expect(useUndo.getState().toast).toBeNull();

    // Dismiss should clear without running the undo.
    let ran = false;
    useUndo.getState().push("Removed: X", () => {
      ran = true;
    });
    useUndo.getState().dismiss();
    expect(ran).toBe(false);
    expect(useUndo.getState().toast).toBeNull();
  });
});

describe("data export round-trips every slice", () => {
  it("includes newly-added slices (todos, kidMeals, notes, energyLog…) in the backup", async () => {
    const { useHub, DATA_KEYS } = await import("../store/hub");
    const json = useHub.getState().exportData();
    const parsed = JSON.parse(json) as { data: Record<string, unknown> };
    for (const key of DATA_KEYS) {
      expect(Object.prototype.hasOwnProperty.call(parsed.data, key)).toBe(true);
    }
    // spot-check the slices the old export forgot
    for (const key of ["todos", "kidMeals", "notes", "energyLog", "equipment", "attachments", "groceryConnections"]) {
      expect(Object.prototype.hasOwnProperty.call(parsed.data, key)).toBe(true);
    }
  });
});

describe("planner board statuses", () => {
  it("moves a task between buckets and keeps done in sync", async () => {
    const { useHub } = await import("../store/hub");
    useHub.getState().addProject("Board test", "Ops");
    const proj = useHub.getState().projects.find((p) => p.name === "Board test")!;
    useHub.getState().addWorkTask(proj.id, "Ship the thing");
    const task = () => useHub.getState().projects.find((p) => p.id === proj.id)!.tasks[0]!;

    useHub.getState().setWorkTaskStatus(proj.id, task().id, "doing");
    expect(task().status).toBe("doing");
    expect(task().done).toBe(false);

    useHub.getState().setWorkTaskStatus(proj.id, task().id, "done");
    expect(task().done).toBe(true);

    // The list-view checkbox stays in sync: toggling done resets to "todo".
    useHub.getState().toggleWorkTask(proj.id, task().id);
    expect(task().done).toBe(false);
    expect(task().status).toBe("todo");
  });
});

describe("work projects", () => {
  it("changes a project's status", async () => {
    const { useHub } = await import("../store/hub");
    useHub.getState().addProject("Website refresh", "Marketing");
    const proj = useHub.getState().projects.find((p) => p.name === "Website refresh")!;
    expect(proj.status).toBe("active");

    useHub.getState().setProjectStatus(proj.id, "blocked");
    expect(useHub.getState().projects.find((p) => p.id === proj.id)?.status).toBe("blocked");
  });
});

describe("chores — one completion per day", () => {
  it("awards points once, then ignores same-day repeats", async () => {
    const { useHub } = await import("../store/hub");
    const kid = useHub.getState().kids[0]!;
    useHub.getState().addChore("Feed the cat", 7);
    const chore = useHub.getState().chores.find((c) => c.title === "Feed the cat")!;
    const before = useHub.getState().kids.find((k) => k.id === kid.id)!.points;

    useHub.getState().completeChore(chore.id, kid.id);
    const afterOne = useHub.getState().kids.find((k) => k.id === kid.id)!.points;
    expect(afterOne).toBe(before + 7);

    // Second attempt today is a no-op — no double points, no extra ledger row.
    const rows = useHub.getState().ledger.filter((t) => t.choreId === chore.id).length;
    useHub.getState().completeChore(chore.id, kid.id);
    expect(useHub.getState().kids.find((k) => k.id === kid.id)!.points).toBe(before + 7);
    expect(useHub.getState().ledger.filter((t) => t.choreId === chore.id).length).toBe(rows);
  });
});

describe("course completion", () => {
  it("adds a completed course and counts its credits toward earned", async () => {
    const { useHub } = await import("../store/hub");
    const { graduationStats } = await import("../selectors");
    const before = graduationStats(useHub.getState()).completed;

    useHub.getState().addCourse("HIST 100", "World History", 3, true);
    const course = useHub.getState().courses.find((c) => c.code === "HIST 100")!;
    expect(course.completed).toBe(true);
    expect(graduationStats(useHub.getState()).completed).toBe(before + 3);

    // Toggling it back to in-progress removes those credits from earned again.
    useHub.getState().toggleCourseCompleted(course.id);
    expect(useHub.getState().courses.find((c) => c.id === course.id)?.completed).toBe(false);
    expect(graduationStats(useHub.getState()).completed).toBe(before);
  });
});

describe("degree template loader", () => {
  it("adds template courses as in-progress and skips duplicates by name", async () => {
    const { useHub } = await import("../store/hub");
    const { WGU_BSCS } = await import("../data/degreeTemplates");
    useHub.setState({ courses: [] });

    const added = useHub.getState().loadDegreeTemplate(
      WGU_BSCS.programName,
      WGU_BSCS.totalCredits,
      WGU_BSCS.courses,
    );
    expect(added).toBe(WGU_BSCS.courses.length);
    expect(useHub.getState().courses.every((c) => c.completed === false)).toBe(true);
    expect(useHub.getState().degreePlan.programName).toBe(WGU_BSCS.programName);

    // Loading again adds nothing (all names already present).
    const again = useHub.getState().loadDegreeTemplate(
      WGU_BSCS.programName,
      WGU_BSCS.totalCredits,
      WGU_BSCS.courses,
    );
    expect(again).toBe(0);
    expect(useHub.getState().courses.length).toBe(WGU_BSCS.courses.length);
  });
});

describe("course pass/fail outcome", () => {
  it("passed earns credits, failed earns nothing and leaves the projection", async () => {
    const { useHub } = await import("../store/hub");
    const { graduationStats } = await import("../selectors");
    useHub.getState().addCourse("CHEM 110", "Chemistry", 4);
    const course = useHub.getState().courses.find((c) => c.code === "CHEM 110")!;
    const base = graduationStats(useHub.getState());

    useHub.getState().setCourseOutcome(course.id, "passed");
    let now = useHub.getState().courses.find((c) => c.id === course.id)!;
    expect(now.outcome).toBe("passed");
    expect(now.completed).toBe(true);
    expect(graduationStats(useHub.getState()).completed).toBe(base.completed + 4);

    useHub.getState().setCourseOutcome(course.id, "failed");
    now = useHub.getState().courses.find((c) => c.id === course.id)!;
    expect(now.outcome).toBe("failed");
    expect(now.completed).toBe(false);
    const failedStats = graduationStats(useHub.getState());
    expect(failedStats.completed).toBe(base.completed);
    // A failed class isn't "in progress" either — it needs a retake decision.
    expect(failedStats.inProgress).toBe(base.inProgress - 4);

    useHub.getState().setCourseOutcome(course.id, "in_progress");
    now = useHub.getState().courses.find((c) => c.id === course.id)!;
    expect(now.outcome).toBeUndefined();
    expect(graduationStats(useHub.getState()).inProgress).toBe(base.inProgress);
  });
});

describe("school portal & alerts", () => {
  it("saves the school portal URL and alert preference, and backs them up", async () => {
    const { useHub } = await import("../store/hub");
    useHub.getState().setSchoolPortalUrl("  https://my.wgu.edu  ");
    expect(useHub.getState().schoolPortalUrl).toBe("https://my.wgu.edu");

    useHub.getState().setAlertsEnabled(true);
    expect(useHub.getState().alertsEnabled).toBe(true);

    const snapshot = useHub.getState().exportData();
    useHub.getState().setSchoolPortalUrl("");
    useHub.getState().setAlertsEnabled(false);
    expect(useHub.getState().importData(snapshot)).toBe(true);
    expect(useHub.getState().schoolPortalUrl).toBe("https://my.wgu.edu");
    expect(useHub.getState().alertsEnabled).toBe(true);
  });
});

describe("kids' weekly meals", () => {
  it("upserts a meal cell and totals calories for the week", async () => {
    const { useHub } = await import("../store/hub");
    const { kidWeekCalories } = await import("../selectors");
    const kid = useHub.getState().kids[0]!;

    useHub.getState().setKidMeal(kid.id, 2, "lunch", "Bento box", 480);
    let cell = useHub
      .getState()
      .kidMeals.find((m) => m.kidId === kid.id && m.day === 2 && m.slot === "lunch");
    expect(cell?.calories).toBe(480);

    // upsert replaces the same cell rather than duplicating
    useHub.getState().setKidMeal(kid.id, 2, "lunch", "Bigger bento", 620);
    const cells = useHub
      .getState()
      .kidMeals.filter((m) => m.kidId === kid.id && m.day === 2 && m.slot === "lunch");
    expect(cells).toHaveLength(1);
    expect(cells[0]?.title).toBe("Bigger bento");

    const week = kidWeekCalories(useHub.getState(), kid.id);
    expect(week.total).toBeGreaterThanOrEqual(620);

    // empty title clears the cell
    useHub.getState().setKidMeal(kid.id, 2, "lunch", "  ", 0);
    cell = useHub
      .getState()
      .kidMeals.find((m) => m.kidId === kid.id && m.day === 2 && m.slot === "lunch");
    expect(cell).toBeUndefined();
  });
});

describe("notes & journal", () => {
  it("adds, edits, pins, and removes a note", async () => {
    const { useHub } = await import("../store/hub");
    useHub.getState().addNote("Field trip", "Bring $5 and a bag lunch");
    const note = useHub.getState().notes.find((n) => n.title === "Field trip");
    expect(note?.body).toBe("Bring $5 and a bag lunch");
    expect(note?.pinned).toBe(false);

    useHub.getState().updateNote(note!.id, { body: "Bring $5, bag lunch, and a jacket" });
    expect(useHub.getState().notes.find((n) => n.id === note!.id)?.body).toContain("jacket");

    useHub.getState().togglePinNote(note!.id);
    expect(useHub.getState().notes.find((n) => n.id === note!.id)?.pinned).toBe(true);

    useHub.getState().removeNote(note!.id);
    expect(useHub.getState().notes.some((n) => n.id === note!.id)).toBe(false);
  });
});

describe("attachments", () => {
  it("adds and removes file metadata scoped to an owner", async () => {
    const { useHub } = await import("../store/hub");
    useHub.getState().addAttachment({
      id: "att_1",
      ownerType: "course",
      ownerId: "course_x",
      name: "syllabus.pdf",
      mime: "application/pdf",
      size: 1234,
      addedAt: new Date(0).toISOString(),
    });
    const forCourse = useHub
      .getState()
      .attachments.filter((a) => a.ownerType === "course" && a.ownerId === "course_x");
    expect(forCourse).toHaveLength(1);
    expect(forCourse[0]?.name).toBe("syllabus.pdf");
    useHub.getState().removeAttachment("att_1");
    expect(useHub.getState().attachments.some((a) => a.id === "att_1")).toBe(false);
  });
});
