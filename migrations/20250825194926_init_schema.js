
export async function up(knex) {
  await knex.schema.createTable("users", (table) => {
    table.increments("id").primary();
    table.string("name").notNullable();
    table.string("email").unique().notNullable();
    table.timestamps(true, true); 
  });

  await knex.schema.createTable("questions", (table) => {
    table.increments("id").primary();
    table.text("question").notNullable();
    table.integer("difficulty").notNullable(); 
    table.integer("user_id").unsigned().references("id").inTable("users").onDelete("CASCADE");
    table.timestamps(true, true);
  });

await knex.schema.createTable("answers", (table) => {
  table.increments("id").primary();

  table.text("answer").notNullable(); 
  table.boolean("is_correct").defaultTo(false);
  table
    .integer("question_id")
    .unsigned()
    .references("id")
    .inTable("questions")
    .onDelete("CASCADE");
  table
    .integer("user_id")
    .unsigned()
    .references("id")
    .inTable("users")
    .onDelete("CASCADE");

 
  table.integer("score"); 
  table.text("strengths"); 
  table.text("improvements"); 
  table.text("missed_points"); 
  table.text("sarcastic_feedback"); 
  table.text("positive_feedback"); 
  table.text("final_feedback"); 
  table.text("actual_answer"); 

  table.timestamps(true, true);
});

}

export async function down(knex) {
  await knex.schema.dropTableIfExists("answers");
  await knex.schema.dropTableIfExists("questions");
  await knex.schema.dropTableIfExists("users");
}
