import { db } from "@/lib/db";
import { scrapingCategories } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";

export const revalidate = 0;

// GET - Liste toutes les catégories
export async function GET() {
  try {
    const categories = await db
      .select()
      .from(scrapingCategories)
      .orderBy(scrapingCategories.isDefault, scrapingCategories.name);

    return NextResponse.json({
      total: categories.length,
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        subreddits: c.subreddits,
        isDefault: c.isDefault,
      })),
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}

// POST - Créer une nouvelle catégorie
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, subreddits } = body;

    if (!name || !Array.isArray(subreddits)) {
      return NextResponse.json(
        { error: "Name and subreddits array required" },
        { status: 400 },
      );
    }

    const [newCategory] = await db
      .insert(scrapingCategories)
      .values({
        id: nanoid(),
        name,
        subreddits,
        isDefault: false,
      })
      .returning();

    return NextResponse.json(newCategory);
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 },
    );
  }
}

// PUT - Mettre à jour une catégorie
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, subreddits } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Category ID required" },
        { status: 400 },
      );
    }

    const [updated] = await db
      .update(scrapingCategories)
      .set({
        name,
        subreddits,
        updatedAt: new Date(),
      })
      .where(eq(scrapingCategories.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 },
    );
  }
}

// DELETE - Supprimer une catégorie
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Category ID required" },
        { status: 400 },
      );
    }

    const [category] = await db
      .select()
      .from(scrapingCategories)
      .where(eq(scrapingCategories.id, id));

    if (category?.isDefault) {
      return NextResponse.json(
        { error: "Cannot delete default categories" },
        { status: 403 },
      );
    }

    await db.delete(scrapingCategories).where(eq(scrapingCategories.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 },
    );
  }
}
