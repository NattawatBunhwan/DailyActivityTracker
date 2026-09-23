import { useState, useEffect } from "react";
import type { Activity } from "../types/activity";
import ActivityList from "./ActivityList";
import { getActivities } from "../api/activityApi";
import useAuth from "../hooks/useAuth";

function Activities() {
    const auth = useAuth()
    const [activities, setActivities] = useState<Activity[]>([])

    useEffect(() => {
        async function loadActivities() {
            if (auth.token) {
                const data = await getActivities(auth.token)

                setActivities(data.items)
            }
        }
        
        loadActivities()
    }, [auth.token])

    return (
        <ActivityList activities={activities} />
    )
}

export default Activities
