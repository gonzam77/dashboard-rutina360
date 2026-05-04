const MUSCLE_GROUPS_URL = "https://rutina360-server.onrender.com/muscleGroup";
const EXERCISES_URL = "https://rutina360-server.onrender.com/ejercice";

async function fetchJson(url, fallbackMessage) {
  const response = await fetch(url, { cache: "no-store" });
  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json?.message || fallbackMessage);
  }

  return Array.isArray(json?.data) ? json.data : [];
}

export default async function CatalogoEjerciciosPage() {
  let muscleGroups = [];
  let exercises = [];
  let errorMessage = "";

  try {
    const [muscleGroupsResult, exercisesResult] = await Promise.all([
      fetchJson(MUSCLE_GROUPS_URL, "No se pudieron cargar los grupos musculares."),
      fetchJson(EXERCISES_URL, "No se pudieron cargar los ejercicios."),
    ]);

    muscleGroups = muscleGroupsResult;
    exercises = exercisesResult;
  } catch (error) {
    errorMessage = error.message;
  }

  return (
    <section className="space-y-6">
      <header className="rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Catalogo ejercicios</h1>
        <p className="mt-3 text-slate-600">
          Grupos musculares y ejercicios asociados del sistema.
        </p>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!errorMessage && muscleGroups.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-slate-600 shadow-sm">
          No hay grupos musculares disponibles.
        </div>
      ) : null}

      {!errorMessage && muscleGroups.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {muscleGroups.map((group) => {
            const groupExercises = exercises.filter(
              (exercise) => String(exercise.idMuscleGroup) === String(group.id)
            );

            return (
              <article
                key={group.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-slate-900">{group.name}</h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {groupExercises.length} ejercicios
                  </span>
                </div>

                {groupExercises.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-600">
                    Este grupo muscular todavia no tiene ejercicios cargados.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-2">
                    {groupExercises.map((exercise) => (
                      <li
                        key={exercise.id}
                        className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                      >
                        {exercise.name}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
